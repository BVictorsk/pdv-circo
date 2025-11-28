// print.js

/**
 * Imprime um recibo para cada item no carrinho, no estilo "quermesse".
 * Cada item gera uma impressão separada.
 *
 * @param {string} vendaId - O ID da venda do Firestore.
 * @param {Array} carrinho - O array de itens no carrinho.
 * @param {number} valorTotal - O valor total da venda.
 * @param {Array} pagamentosEfetuados - Lista de pagamentos.
 * @param {number} trocoNecessario - O valor do troco.
 * @param {function} formatarPreco - Função para formatar valores monetários.
 * @param {string} loggedInUser - O nome do operador logado.
 */
function imprimirRecibo(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, loggedInUser) {
    const data = new Date();
    const dataFormatada = `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}`;
    const operador = loggedInUser || 'N/A';

    // 1. Tentar imprimir via interface AndroidPrint (o método principal)
    if (window.AndroidPrint && typeof window.AndroidPrint.print === 'function') {
        console.log("Modo de impressão 'Quermesse' ativado. Imprimindo cada item separadamente.");

        // --- LÓGICA PRINCIPAL MODIFICADA ---
        // Itera sobre cada item no carrinho.
        carrinho.forEach(item => {
            // A 'quantidade' de um item determina quantas vezes ele deve ser impresso.
            for (let i = 0; i < item.quantidade; i++) {
                
                // Monta o texto de impressão para UM ÚNICO item.
                let dadosParaImpressao = '';
                dadosParaImpressao += `        PATATI PATATA PDV\n`;
                dadosParaImpressao += `--------------------------------\n`;
                dadosParaImpressao += `            ${item.nome.toUpperCase()}\n`; // Nome do item em destaque
                dadosParaImpressao += `--------------------------------\n`;
                dadosParaImpressao += `Venda: #${vendaId.substring(0, 6)}\n`; // ID da venda para referência
                dadosParaImpressao += `Data: ${dataFormatada}\n`;
                dadosParaImpressao += `Operador: ${operador}\n`;
                
                // Comando de corte para separar este cupom.
                dadosParaImpressao += `  <cut>\n`; 

                // Envia este cupom individual para a impressão no Android.
                console.log(`Enviando para impressão: 1x ${item.nome}`);
                window.AndroidPrint.print(dadosParaImpressao);
            }
        });
        
    } else {
        // 2. Fallback para impressão via navegador (se a interface Android não for encontrada)
        // Este modo continua imprimindo um recibo único, pois a impressão web não suporta múltiplos cortes.
        console.warn("Interface AndroidPrint não encontrada. Imprimindo um recibo consolidado via navegador.");
        imprimirViaNavegador(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, operador, dataFormatada);
    }
}

/**
 * Função de fallback para imprimir um recibo consolidado na web.
 * (Esta é a sua lógica de impressão web original, isolada em uma função).
 */
function imprimirViaNavegador(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, operador, dataFormatada) {
    let itensReciboHTML = carrinho.map(item => `
        <tr>
            <td>${item.quantidade}x ${item.nome}</td>
            <td>${formatarPreco(item.valor * item.quantidade)}</td>
        </tr>
    `).join('');

    let pagamentosReciboHTML = pagamentosEfetuados.map(p => `
        <p><strong>${p.tipo.toUpperCase()}:</strong> ${formatarPreco(p.valor)}</p>
    `).join('');

    const conteudoRecibo = `
        <html>
        <head>
            <title>Recibo</title>
            <style>
                body { font-family: 'Courier New', monospace; font-size: 10px; }
                .recibo-container { width: 280px; margin: 0 auto; }
                h2, p, table { margin: 5px 0; }
                hr { border: none; border-top: 1px dashed #000; }
            </style>
        </head>
        <body>
            <div class="recibo-container">
                <h2>Patati Patata PDV</h2>
                <p>Data: ${dataFormatada}</p>
                <p>Operador: ${operador}</p>
                <p>Venda: #${vendaId}</p>
                <hr>
                <table>${itensReciboHTML}</table>
                <hr>
                <p><strong>TOTAL:</strong> ${formatarPreco(valorTotal)}</p>
                ${pagamentosReciboHTML}
                ${trocoNecessario > 0 ? `<p><strong>TROCO:</strong> ${formatarPreco(trocoNecessario)}</p>` : ''}
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
    printWindow.print();
    printWindow.close();
}
