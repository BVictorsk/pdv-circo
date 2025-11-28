// print.js

// This function will be called from script.js
// Imprime cada produto individualmente (estilo quermesse/pizzaria)
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

    // 1. Tentar imprimir via interface AndroidPrint (mini app)
    if (window.AndroidPrint && typeof window.AndroidPrint.print === 'function') {
        console.log("Enviando dados para impressão para o mini app Android:", dadosParaImpressao);
        window.AndroidPrint.print(dadosParaImpressao);
    } else {
        // 2. Fallback para a interface AndroidInterface (antiga, se existir)
        if (window.AndroidInterface && window.AndroidInterface.imprimirCupom) {
            console.log("Interface AndroidPrint não encontrada, tentando AndroidInterface (legado).");
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
            window.AndroidInterface.imprimirCupom(JSON.stringify(reciboParaAndroid), "192.168.1.200");
        } else {
            // 3. Fallback para impressão via navegador (método existente)
            console.log("Nenhuma interface Android detectada. Imprimindo via navegador.");
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
    }
}
