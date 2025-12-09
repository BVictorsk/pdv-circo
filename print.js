// print.js

/**
 * Prepara e imprime um recibo, escolhendo o método (Android ou Navegador).
 * A formatação para Android é feita com alinhamento manual para maior compatibilidade.
 */
function imprimirRecibo(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, loggedInUser, tipoVenda = 'RECIBO', justificativa = '') {
    const data = new Date();
    const dataFormatada = `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}`;
    const operador = loggedInUser || 'N/A';

    if (window.AndroidPrint && typeof window.AndroidPrint.print === 'function') {
        // Largura padrão para impressoras de 80mm é ~42/48 caracteres. Usamos 42 para segurança.
        const LARGURA_COLUNA = 42;

        const centralizar = (texto) => {
            if (!texto) return '\n';
            const espacos = ' '.repeat(Math.max(0, Math.floor((LARGURA_COLUNA - texto.length) / 2)));
            return `${espacos}${texto}\n`;
        };

        const linha = '-'.repeat(LARGURA_COLUNA) + '\n';

        if (tipoVenda === 'BRINDE') {
            imprimirReciboBrindeAndroid(vendaId, carrinho, operador, dataFormatada, justificativa, centralizar, linha);
        } else {
            imprimirReciboQuermesseAndroid(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, operador, dataFormatada, centralizar, linha);
        }
    } else {
        console.warn("Interface AndroidPrint não encontrada. Imprimindo via navegador.");
        imprimirViaNavegador(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, operador, dataFormatada, tipoVenda, justificativa);
    }
}

/**
 * Gera o texto do recibo para BRINDES e envia para impressão no Android.
 */
function imprimirReciboBrindeAndroid(vendaId, carrinho, operador, dataFormatada, justificativa, centralizar, linha) {
    console.log("Modo 'Brinde'. Enviando cupons com alinhamento manual.");

    let textoJustificativa = '';
    if (justificativa && justificativa.trim() !== '') {
        textoJustificativa = `Motivo: ${justificativa}\n`;
    }

    carrinho.forEach(item => {
        for (let i = 0; i < item.quantidade; i++) {
            let cupom = '';
            cupom += centralizar('PATATI PATATA PDV');
            cupom += linha;
            cupom += centralizar('** CORTESIA **');
            cupom += linha;
            cupom += centralizar(item.nome.toUpperCase());
            cupom += linha;
            cupom += `Venda: #${vendaId}\n`;
            cupom += `Data: ${dataFormatada}\n`;
            cupom += `Operador: ${operador}\n`;
            if (textoJustificativa) {
                cupom += textoJustificativa;
            }
            cupom += '\n\n'; // Espaçamento final

            console.log(`Enviando para impressão: 1x ${item.nome} (Brinde)`);
            window.AndroidPrint.print(cupom);
        }
    });
}

/**
 * Gera o texto do recibo para VENDAS e envia para impressão no Android.
 */
function imprimirReciboQuermesseAndroid(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, operador, dataFormatada, centralizar, linha) {
    console.log("Modo 'Quermesse'. Enviando cupons com alinhamento manual.");

    let textoFinanceiro = linha;
    textoFinanceiro += `TOTAL: ${formatarPreco(valorTotal)}\n`;
    if (Array.isArray(pagamentosEfetuados)) {
        pagamentosEfetuados.forEach(p => {
            textoFinanceiro += `${p.tipo.toUpperCase()}: ${formatarPreco(p.valor)}\n`;
        });
    }
    if (trocoNecessario > 0) {
        textoFinanceiro += `TROCO: ${formatarPreco(trocoNecessario)}\n`;
    }
    textoFinanceiro += linha;

    carrinho.forEach(item => {
        for (let i = 0; i < item.quantidade; i++) {
            let cupom = '';
            cupom += centralizar('PATATI PATATA PDV');
            cupom += linha;
            cupom += centralizar(item.nome.toUpperCase());
            cupom += centralizar(`(1x ${formatarPreco(item.preco)})`);
            cupom += linha;
            cupom += `Venda: #${vendaId}\n`;
            cupom += `Data: ${dataFormatada}\n`;
            cupom += `Operador: ${operador}\n`;
            cupom += textoFinanceiro;
            cupom += centralizar('Obrigado!');
            cupom += '\n\n'; // Espaçamento final

            console.log(`Enviando para impressão: 1x ${item.nome}`);
            window.AndroidPrint.print(cupom);
        }
    });
}

/**
 * Imprime as fichas de troca com alinhamento manual.
 */
function imprimirFichas(itensParaImprimir, vendaId) {
    const data = new Date();
    const dataFormatada = `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}`;
    const loggedInUser = sessionStorage.getItem('loggedInUser') || 'N/A';
    const LARGURA_COLUNA = 42;
    const centralizar = (texto) => {
        if (!texto) return '\n';
        const espacos = ' '.repeat(Math.max(0, Math.floor((LARGURA_COLUNA - texto.length) / 2)));
        return `${espacos}${texto}\n`;
    };
    const linha = '-'.repeat(LARGURA_COLUNA) + '\n';

    if (window.AndroidPrint && typeof window.AndroidPrint.print === 'function') {
        console.log("Imprimindo fichas da troca.");

        itensParaImprimir.forEach(item => {
            for (let i = 0; i < item.quantidade; i++) {
                let cupom = '';
                cupom += centralizar('PATATI PATATA PDV');
                cupom += linha;
                cupom += centralizar(item.nome.toUpperCase());
                cupom += linha;
                cupom += `Venda Original: #${vendaId}\n`;
                cupom += `Data da Troca: ${dataFormatada}\n`;
                cupom += `Operador: ${loggedInUser}\n`;
                cupom += '\n\n'; // Espaçamento final

                console.log(`Imprimindo ficha de troca: 1x ${item.nome}`);
                window.AndroidPrint.print(cupom);
            }
        });
    } else {
        console.warn("Interface AndroidPrint não encontrada. A impressão de fichas de troca não pode continuar via navegador.");
        alert("A função de impressão de fichas só está disponível no ambiente do aplicativo Android.");
    }
}


/**
 * Função de fallback para imprimir um recibo consolidado na web.
 */
function imprimirViaNavegador(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, operador, dataFormatada, tipoVenda, justificativa) {
    const isBrinde = tipoVenda === 'BRINDE';
    const titulo = isBrinde ? 'COMPROVANTE DE CORTESIA' : (tipoVenda === 'TROCA' ? 'COMPROVANTE DE TROCA' : 'RECIBO DE VENDA');
    
    let itensReciboHTML = '';
    if (isBrinde) {
        itensReciboHTML = carrinho.map(item => `
            <tr>
                <td>${item.quantidade}x ${item.nome}</td>
            </tr>
        `).join('');
    } else {
        itensReciboHTML = carrinho.map(item => {
            let indicador = '';
            if (tipoVenda === 'TROCA') {
                if (item.quantidade < 0) indicador = ' (Devolvido)';
                else if (item.quantidade > 0) indicador = ' (Adicionado)';
            }
            const quantidade = Math.abs(item.quantidade);
            const nome = item.nome + indicador;

            return `
            <tr>
                <td>${quantidade}x ${nome}</td>
                <td>${formatarPreco(item.preco * quantidade)}</td>
            </tr>`;
        }).join('');
    }

    let corpoFinanceiroHTML = '';
    if (!isBrinde) {
        let pagamentosReciboHTML = Array.isArray(pagamentosEfetuados) ? pagamentosEfetuados.map(p => `<p><strong>${p.tipo.toUpperCase()}:</strong> ${formatarPreco(p.valor)}</p>`).join('') : '';
        let totalLabel = tipoVenda === 'TROCA' ? "DIFERENÇA A PAGAR" : "TOTAL";

        corpoFinanceiroHTML = `
            <hr>
            <p><strong>${totalLabel}:</strong> ${formatarPreco(valorTotal)}</p>
            ${pagamentosReciboHTML}
            ${trocoNecessario > 0 ? `<p><strong>TROCO:</strong> ${formatarPreco(trocoNecessario)}</p>` : ''}
        `;
    }
    
    let justificativaHTML = '';
    if (isBrinde && justificativa && justificativa.trim() !== '') {
        justificativaHTML = `<hr><p><strong>Motivo:</strong> ${justificativa}</p>`;
    }


    const conteudoRecibo = `
        <html>
        <head>
            <title>${titulo}</title>
            <style>
                body { font-family: 'Courier New', monospace; font-size: 10px; }
                .recibo-container { width: 280px; margin: 0 auto; }
                h2, h3, p, table { margin: 5px 0; }
                hr { border: none; border-top: 1px dashed #000; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 2px 0; }
            </style>
        </head>
        <body>
            <div class="recibo-container">
                <h2>Patati Patata PDV</h2>
                <h3>${titulo}</h3>
                <p>Data: ${dataFormatada}</p>
                <p>Operador: ${operador}</p>
                <p>Venda: #${vendaId}</p>
                <hr>
                <table>${itensReciboHTML}</table>
                ${justificativaHTML}
                ${corpoFinanceiroHTML}
                <hr>
                <p style="text-align: center;">Obrigado!</p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(conteudoRecibo);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}
