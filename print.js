// print.js

// This function will be called from script.js
// Imprime cada produto individualmente (estilo quermesse/pizzaria)
function imprimirRecibo(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, loggedInUser) {
    const data = new Date();
    const dataFormatada = `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}`;

    // Função auxiliar para imprimir cada item individualmente
    function imprimirItemIndividual(item, index, total) {
        let cupom = `PATATI PATATA\n`;
        cupom += `${item.produto.toUpperCase()}\n`;
        cupom += `------------------------------\n`;
        cupom += `Qtd: ${item.qtd}\n`;
        cupom += `Valor Unit: ${formatarPreco(item.preco)}\n`;
        cupom += `Subtotal: ${formatarPreco(item.preco * item.qtd)}\n`;
        cupom += `------------------------------\n`;
        cupom += `Data: ${dataFormatada}\n`;
        cupom += `Operador: ${loggedInUser || 'N/A'}\n`;
        cupom += `\n\n`;
        
        // Adiciona sequência de corte ESC/POS (GS V A n)
        cupom += '\x1D\x56\x41\x00';
        
        return cupom;
    }

    // Enviar cada item para impressão sequencialmente
    let successCount = 0;
    
    // Mapear todos os cupons a imprimir
    const cupons = carrinho.map((item, index) => 
        imprimirItemIndividual(item, index, carrinho.length)
    );

    // Adicionar cupom de resumo final apenas se houver pagamentos
    if (pagamentosEfetuados.length > 0) {
        let resumoCupom = `PATATI PATATA - FECHAMENTO\n`;
        resumoCupom += `------------------------------\n`;
        resumoCupom += `Venda ID: ${vendaId}\n`;
        resumoCupom += `TOTAL: ${formatarPreco(valorTotal)}\n\n`;
        resumoCupom += `PAGAMENTOS:\n`;
        pagamentosEfetuados.forEach(p => {
            resumoCupom += `${p.tipo}: ${formatarPreco(p.valor)}\n`;
        });
        if (trocoNecessario > 0) {
            resumoCupom += `------------------------------\n`;
            resumoCupom += `TROCO: ${formatarPreco(trocoNecessario)}\n`;
        }
        resumoCupom += `\nData: ${dataFormatada}\n`;
        resumoCupom += `Operador: ${loggedInUser || 'N/A'}\n`;
        resumoCupom += `\n\n`;
        resumoCupom += '\x1D\x56\x41\x00';
        
        cupons.push(resumoCupom);
    }

    // Função para enviar cupom para impressão
    function enviarCupom(dadosParaImpressao, callback) {
        // 1. Tentar imprimir via interface AndroidPrint
        if (window.AndroidPrint && typeof window.AndroidPrint.print === 'function') {
            console.log('AndroidPrint.print detectado. Enviando cupom para impressão.');
            try {
                window.AndroidPrint.print(dadosParaImpressao);
                if (callback) callback(true);
                return;
            } catch (e) {
                console.error('Erro ao chamar AndroidPrint.print:', e);
                if (callback) callback(false);
            }
        }

        // Se AndroidPrint existir, mas não tiver método print, tentamos outros métodos
        if (window.AndroidPrint) {
            console.log('AndroidPrint detectado sem método print; tentando fallbacks.');
            if (typeof window.AndroidPrint.printBase64 === 'function') {
                const b64 = escposBase64ForText(dadosParaImpressao);
                if (b64) {
                    try { window.AndroidPrint.printBase64(b64); if (callback) callback(true); return; } catch (e) { console.error(e); }
                }
            }
            if (typeof window.AndroidPrint.printText === 'function') {
                try { window.AndroidPrint.printText(dadosParaImpressao); if (callback) callback(true); return; } catch (e) { console.error(e); }
            }
        }

        // 2. Fallback para a interface AndroidInterface (legado)
        if (window.AndroidInterface) {
            console.log('AndroidInterface detectado. Tentando métodos legados.');
            if (typeof window.AndroidInterface.imprimirTexto === 'function') {
                try { window.AndroidInterface.imprimirTexto(dadosParaImpressao); if (callback) callback(true); return; } catch (e) { console.error(e); }
            }
        }

        // Se nenhuma interface Android foi encontrada, não fazer fallback para browser print
        // pois vamos imprimir múltiplos cupons
        console.warn('Nenhuma interface Android de impressão detectada.');
        if (callback) callback(false);
    }

    // Função para imprimir cupons sequencialmente com pequeno delay
    function imprimirSequencialmente(cupons, index = 0) {
        if (index >= cupons.length) {
            console.log(`Impressão concluída: ${cupons.length} cupom(ns) enviado(s)`);
            return;
        }

        const cupomAtual = cupons[index];
        console.log(`Enviando cupom ${index + 1} de ${cupons.length}`);
        
        enviarCupom(cupomAtual, (sucesso) => {
            if (sucesso) successCount++;
            // Pequeno delay entre cupons (500ms)
            setTimeout(() => {
                imprimirSequencialmente(cupons, index + 1);
            }, 500);
        });
    }

    // Iniciar impressão sequencial
    if (cupons.length > 0) {
        imprimirSequencialmente(cupons);
    } else {
        console.warn('Carrinho vazio, nada para imprimir.');
    }
}

// Helpers: converter texto para ESC/POS (Base64) para impressoras térmicas
function uint8ToBase64(u8) {
    let binary = '';
    for (let i = 0; i < u8.length; i++) {
        binary += String.fromCharCode(u8[i]);
    }
    return btoa(binary);
}

function escposBase64ForText(text) {
    try {
        const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
        let textBytes;
        if (encoder) {
            textBytes = encoder.encode(text + '\n\n\n');
        } else {
            const str = unescape(encodeURIComponent(text + '\n\n\n'));
            textBytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) textBytes[i] = str.charCodeAt(i);
        }

        // Corte parcial comum: GS V 65 0  (pode variar conforme modelo)
        const cut = new Uint8Array([0x1D, 0x56, 0x41, 0x00]);
        const data = new Uint8Array(textBytes.length + cut.length);
        data.set(textBytes, 0);
        data.set(cut, textBytes.length);
        return uint8ToBase64(data);
    } catch (err) {
        console.error('Erro ao gerar ESC/POS Base64:', err);
        return null;
    }
}