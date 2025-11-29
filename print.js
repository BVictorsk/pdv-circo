// print.js

/**
 * Imprime um recibo para cada item no carrinho, no estilo "quermesse".
 * Cada item gera uma impressão separada com ID da venda, total e pagamentos.
 */
function imprimirRecibo(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, loggedInUser) {
    const data = new Date();
    // Formato DDMMYYYYHHMMSS
    const timestamp = `${data.getDate().toString().padStart(2, '0')}${ (data.getMonth() + 1).toString().padStart(2, '0')}${data.getFullYear()}${data.getHours().toString().padStart(2, '0')}${data.getMinutes().toString().padStart(2, '0')}${data.getSeconds().toString().padStart(2, '0')}`;
    const operador = loggedInUser || 'N/A';
    
    // Constrói o ID da venda personalizado que você queria.
    // Ex: "admin-28112025-1" (usando o ID da venda do firestore)
    const idVendaPersonalizado = `${operador.toLowerCase()}-${timestamp}-${vendaId.slice(-4)}`;

    // Gera o texto das formas de pagamento e totais UMA VEZ para ser usado em todos os cupons.
    let textoFinanceiro = `--------------------------------\n`;
    textoFinanceiro += `TOTAL DA VENDA: ${formatarPreco(valorTotal)}\n`;
    pagamentosEfetuados.forEach(p => {
        textoFinanceiro += `${p.tipo.toUpperCase()}: ${formatarPreco(p.valor)}\n`;
    });
    if (trocoNecessario > 0) {
        textoFinanceiro += `TROCO: ${formatarPreco(trocoNecessario)}\n`;
    }

    if (window.AndroidPrint && typeof window.AndroidPrint.print === 'function') {
        console.log("Modo 'Quermesse'. Imprimindo cada item separadamente.");

        let dadosCompletosParaImpressao = '';

        // Itera sobre cada item no carrinho.
        carrinho.forEach(item => {
            // A 'quantidade' de um item determina quantas vezes ele deve ser impresso.
            for (let i = 0; i < item.quantidade; i++) {
                
                // Monta o texto para UM ÚNICO cupom.
                let cupomIndividual = '';
                cupomIndividual += `        PATATI PATATA PDV\n`;
                cupomIndividual += `--------------------------------\n`;
                // Destaque para o item
                cupomIndividual += `          ${item.nome.toUpperCase()}\n`;
                cupomIndividual += `  (1x ${formatarPreco(item.preco)})\n`;
                cupomIndividual += `--------------------------------\n`;
                
                // Informações da venda e pagamento
                cupomIndividual += `Venda: ${idVendaPersonalizado}\n`; // ID PERSONALIZADO da venda
                cupomIndividual += `Data: ${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}\n`;
                cupomIndividual += `Operador: ${operador}\n`;
                
                // Adiciona o bloco financeiro (total e pagamentos)
                cupomIndividual += textoFinanceiro;
                
                // Adiciona espaço e o marcador de corte
                cupomIndividual += `\n\n<cut>\n`; 

                dadosCompletosParaImpressao += cupomIndividual;
            }
        });
        
        // Envia a string concatenada de TODOS os cupons de uma só vez para o Android.
        console.log("Enviando bloco de impressão para o Android.");
        window.AndroidPrint.print(dadosCompletosParaImpressao);
        
    } else {
        console.warn("Interface AndroidPrint não encontrada. Use o fallback para navegador.");
    }
}