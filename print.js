// print.js

/**
 * Imprime um recibo para cada item no carrinho, no estilo "quermesse".
 * Cada item gera uma impressão separada COM TODAS as informações da venda.
 *
 * @param {string} vendaId - O ID da venda do Firestore.
 * @param {Array} carrinho - O array de itens no carrinho.
 * @param {number} valorTotal - O valor total da venda.
 * @param {Array} pagamentosEfetuados - Lista de pagamentos.
 * @param {number} trocoNecessario - O valor do troco.
 * @param {function} formatarPreco - Função para formatar valores monetários.
 * @param {string} loggedInUser - O nome do operador logado.
 * @param {string} titulo - O título do recibo (e.g., "RECIBO DE VENDA").
 */

function imprimirRecibo(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, loggedInUser, titulo = 'RECIBO') {
    const data = new Date();
    const dataFormatada = `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}`;
    const operador = loggedInUser || 'N/A';

    if (window.AndroidPrint && typeof window.AndroidPrint.print === 'function') {
        console.log("Modo 'Quermesse'. Enviando cupons individuais.");

        // 1. Monta o bloco de informações financeiras UMA VEZ para reutilização.
        let textoFinanceiro = `--------------------------------\n`;
        textoFinanceiro += `TOTAL: ${formatarPreco(valorTotal)}\n`;
        if (Array.isArray(pagamentosEfetuados)) {
            pagamentosEfetuados.forEach(p => {
                textoFinanceiro += `${p.tipo.toUpperCase()}: ${formatarPreco(p.valor)}\n`;
            });
        }
        if (trocoNecessario > 0) {
            textoFinanceiro += `TROCO: ${formatarPreco(trocoNecessario)}\n`;
        }
        textoFinanceiro += `--------------------------------\n`;

        // 2. Itera sobre cada item para criar e imprimir seu cupom individualmente.
        carrinho.forEach(item => {
            for (let i = 0; i < item.quantidade; i++) {
                let cupomIndividual = '';
                cupomIndividual += `        PATATI PATATA PDV\n`;
                cupomIndividual += `--------------------------------\n`;
                cupomIndividual += `          ${item.nome.toUpperCase()}\n`; // Item em destaque
                cupomIndividual += `  (1x ${formatarPreco(item.preco)})\n`;
                cupomIndividual += `--------------------------------\n`;
                
                // --- INFORMAÇÕES ADICIONAIS ---
                cupomIndividual += `Venda: #${vendaId}\n`;
                cupomIndividual += `Data: ${dataFormatada}\n`;
                cupomIndividual += `Operador: ${operador}\n`;
                
                // Adiciona o bloco financeiro
                cupomIndividual += textoFinanceiro;
                
                cupomIndividual += `Obrigado!\n\n\n`; // Adicione mais espaço se necessário antes do corte

                // Envia este cupom específico para o Android. O corte será tratado no lado nativo.
                console.log(`Enviando para impressão: 1x ${item.nome}`);
                window.AndroidPrint.print(cupomIndividual);
            }
        });

    } else {
        console.warn("Interface AndroidPrint não encontrada. Imprimindo um recibo consolidado via navegador.");
        imprimirViaNavegador(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, operador, dataFormatada, titulo);
    }
}

/**
 * **NOVA FUNÇÃO**
 * Imprime as fichas apenas para os itens adicionados ou alterados em uma troca.
 * @param {Array} itensParaImprimir - A lista de itens (com a quantidade da *diferença*) a ser impressa.
 * @param {string} vendaId - O ID da venda original para referência.
 */
function imprimirFichas(itensParaImprimir, vendaId) {
    const data = new Date();
    const dataFormatada = `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}`;
    const loggedInUser = sessionStorage.getItem('loggedInUser') || 'N/A'; // Pega o usuário da sessão

    if (window.AndroidPrint && typeof window.AndroidPrint.print === 'function') {
        console.log("Imprimindo fichas da troca.");

        itensParaImprimir.forEach(item => {
            for (let i = 0; i < item.quantidade; i++) {
                let dadosParaImpressao = '';
                dadosParaImpressao += `        PATATI PATATA PDV\n`;
                dadosParaImpressao += `--------------------------------\n`;
                dadosParaImpressao += `            ${item.nome.toUpperCase()}\n`;
                dadosParaImpressao += `--------------------------------\n`;
                dadosParaImpressao += `Venda: #${vendaId}\n`;
                dadosParaImpressao += `Data da Troca: ${dataFormatada}\n`;
                dadosParaImpressao += `Operador: ${loggedInUser}\n`;
                dadosParaImpressao += `  <cut>\n`;

                console.log(`Imprimindo ficha de troca: 1x ${item.nome}`);
                window.AndroidPrint.print(dadosParaImpressao);
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
function imprimirViaNavegador(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, operador, dataFormatada, titulo) {
    let itensReciboHTML = carrinho.map(item => {
        // Adiciona um indicador de devolução ou adição para trocas
        let indicador = '';
        if (titulo.includes('TROCA')) {
            if (item.quantidade < 0) {
                indicador = ' (Devolvido)';
            } else if (item.quantidade > 0) {
                indicador = ' (Adicionado)';
            }
        }
        const quantidade = Math.abs(item.quantidade);
        const nome = item.nome + indicador;

        return `
        <tr>
            <td>${quantidade}x ${nome}</td>
            <td>${formatarPreco(item.preco * quantidade)}</td>
        </tr>
    `}).join('');

    // Garante que pagamentosEfetuados é um array antes de mapear
    let pagamentosReciboHTML = Array.isArray(pagamentosEfetuados) ? pagamentosEfetuados.map(p => `
        <p><strong>${p.tipo.toUpperCase()}:</strong> ${formatarPreco(p.valor)}</p>
    `).join('') : '';

    // Determina o que mostrar como valor total
    let totalLabel = "TOTAL";
    let totalValue = valorTotal;
    if (titulo.includes('TROCA')) {
        totalLabel = "DIFERENÇA A PAGAR";
        // O valor total já é a diferença, então usamos ele diretamente
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
                <hr>
                <p><strong>${totalLabel}:</strong> ${formatarPreco(totalValue)}</p>
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
    // Pequeno atraso para garantir que o conteúdo seja renderizado antes de imprimir
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}
