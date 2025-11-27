// print.js

// This function will be called from script.js
function imprimirRecibo(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, loggedInUser) {
    const data = new Date();
    const dataFormatada = `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}`;

    // Montar o objeto recibo para Android e/ou impressão web
    const recibo = {
        id: vendaId, // Usar o ID da venda do Firestore
        total: valorTotal, // Total numérico
        itens: carrinho.map(item => ({
            produto: item.nome,
            qtd: item.quantidade,
            valor: item.preco // Valor unitário do item
        })),
        pagamentos: pagamentosEfetuados.map(p => ({
            tipo: p.tipo.toUpperCase(),
            valor: p.valor
        })),
        troco: trocoNecessario,
        data: dataFormatada,
        operador: loggedInUser || 'N/A'
    };

    // Constrói o texto de impressão em formato simples
    let dadosParaImpressao = `PATATI PATATA PDV\n`;
    dadosParaImpressao += `Data: ${recibo.data}\n`;
    dadosParaImpressao += `Operador: ${recibo.operador}\n`;
    dadosParaImpressao += `------------------------------\n`;
    dadosParaImpressao += `ITENS:\n`;
    recibo.itens.forEach(item => {
        dadosParaImpressao += `${item.qtd}x ${item.produto} - ${formatarPreco(item.valor * item.qtd)}\n`;
    });
    dadosParaImpressao += `------------------------------\n`;
    dadosParaImpressao += `TOTAL: ${formatarPreco(recibo.total)}\n`;
    recibo.pagamentos.forEach(p => {
        dadosParaImpressao += `${p.tipo}: ${formatarPreco(p.valor)}\n`;
    });
    if (recibo.troco > 0) {
        dadosParaImpressao += `TROCO: ${formatarPreco(recibo.troco)}\n`;
    }
    dadosParaImpressao += `------------------------------\n`;
    dadosParaImpressao += `Obrigado e volte sempre!\n\n\n\n\n  <cut>\n`; // Comando de corte

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

    // 1. Tentar imprimir via interface AndroidPrint (mini app)
    if (window.AndroidPrint) {
        console.log('AndroidPrint detectado. Tentando múltiplos métodos de envio...');
        // Preferir método que aceite Base64/raw bytes
        if (typeof window.AndroidPrint.printBase64 === 'function') {
            const b64 = escposBase64ForText(dadosParaImpressao);
            if (b64) {
                console.log('Enviando Base64 ESC/POS para AndroidPrint.printBase64');
                try { window.AndroidPrint.printBase64(b64); return; } catch (e) { console.error(e); }
            }
        }
        // Métodos de texto conhecidos
        if (typeof window.AndroidPrint.print === 'function') {
            console.log('Enviando texto para AndroidPrint.print');
            try { window.AndroidPrint.print(dadosParaImpressao); return; } catch (e) { console.error(e); }
        }
        if (typeof window.AndroidPrint.printText === 'function') {
            console.log('Enviando texto para AndroidPrint.printText');
            try { window.AndroidPrint.printText(dadosParaImpressao); return; } catch (e) { console.error(e); }
        }
        // Se houver um método genérico para envio de bytes
        if (typeof window.AndroidPrint.sendBytes === 'function') {
            const b64 = escposBase64ForText(dadosParaImpressao);
            if (b64) {
                console.log('Enviando Base64 para AndroidPrint.sendBytes');
                try { window.AndroidPrint.sendBytes(b64); return; } catch (e) { console.error(e); }
            }
        }
        console.warn('AndroidPrint presente, mas nenhum método conhecido funcionou. Chaves disponíveis:', Object.keys(window.AndroidPrint));
    }

    // 2. Fallback para a interface AndroidInterface (antiga, se existir)
    if (window.AndroidInterface) {
        console.log('AndroidInterface detectado. Tentando métodos legados...');
        if (typeof window.AndroidInterface.imprimirCupom === 'function') {
            console.log('Usando AndroidInterface.imprimirCupom com JSON (legado).');
            const reciboParaAndroid = {
                ...recibo,
                total: formatarPreco(recibo.total),
                itens: recibo.itens.map(item => ({
                    ...item,
                    valor: formatarPreco(item.valor * item.qtd)
                })),
                pagamentos: recibo.pagamentos.map(p => ({
                    ...p,
                    valor: formatarPreco(p.valor)
                })),
                troco: formatarPreco(recibo.troco)
            };
            try { window.AndroidInterface.imprimirCupom(JSON.stringify(reciboParaAndroid), "192.168.1.200"); return; } catch (e) { console.error(e); }
        }
        if (typeof window.AndroidInterface.imprimirTexto === 'function') {
            console.log('Usando AndroidInterface.imprimirTexto (legado)');
            try { window.AndroidInterface.imprimirTexto(dadosParaImpressao); return; } catch (e) { console.error(e); }
        }
        console.warn('AndroidInterface presente, mas nenhum método legível funcionou. Chaves disponíveis:', Object.keys(window.AndroidInterface));
    }

    // 3. Fallback para impressão via navegador (método existente)
    console.log("Nenhuma interface Android detectada ou nenhum método funcionou. Imprimindo via navegador.");
            let itensReciboHTML = recibo.itens.map(item => `
                <tr>
                    <td>${item.qtd}x ${item.produto}</td>
                    <td>${formatarPreco(item.valor * item.qtd)}</td>
                </tr>
            `).join('');

            let pagamentosReciboHTML = recibo.pagamentos.map(p => `
                <p><strong>${p.tipo}:</strong> ${formatarPreco(p.valor)}</p>
            `).join('');

            const conteudoRecibo = `
                <html>
                <head>
                    <title>Recibo</title>
                    <style>
                        body { font-family: 'Courier New', monospace; font-size: 10px; color: #000; }
                        .recibo-container { width: 280px; margin: 0 auto; }
                        h2 { text-align: center; margin-bottom: 10px; font-size: 14px; }
                        p { margin: 2px 0; }
                        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        th, td { text-align: left; padding: 2px; }
                        .total { font-weight: bold; font-size: 12px; }
                        hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
                    </style>
                </head>
                <body>
                    <div class="recibo-container">
                        <h2>Patati Patata PDV</h2>
                        <p>Data: ${recibo.data}</p>
                        <p>Operador: ${recibo.operador}</p>
                        <hr>
                        <table>
                            ${itensReciboHTML}
                        </table>
                        <hr>
                        <p class="total">TOTAL: ${formatarPreco(recibo.total)}</p>
                        ${pagamentosReciboHTML}
                        ${recibo.troco > 0 ? `<p class="total">TROCO: ${formatarPreco(recibo.troco)}</p>` : ''}
                        <hr>
                        <p style="text-align: center;">Obrigado e volte sempre!</p>
                    </div>
                </body>
                </html>
            `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(conteudoRecibo);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
}
