document.addEventListener('DOMContentLoaded', async () => {
    const userDisplay = document.getElementById('user-display');
    const resumoContent = document.getElementById('resumo-content');
    const loggedInUser = sessionStorage.getItem('loggedInUser');

    if (!loggedInUser) {
        resumoContent.innerHTML = '<p style="color: var(--red-error);">Erro: Usuário não logado. Por favor, faça o login novamente.</p>';
        return;
    }

    userDisplay.textContent = loggedInUser;

    if (typeof db === 'undefined' || !db) {
        resumoContent.innerHTML = '<p style="color: var(--red-error);">Erro de conexão com o banco de dados.</p>';
        return;
    }

    try {
        // Pega a data de hoje no formato YYYY-MM-DD para o início e fim do dia
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfDay = today;

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endOfDay = tomorrow;

        console.log(`Buscando vendas para o operador '${loggedInUser}' entre ${startOfDay.toLocaleString()} e ${endOfDay.toLocaleString()}`);

        // Query no Firestore para buscar as vendas do dia para o operador logado
        const vendasSnapshot = await db.collection('vendas')
            .where('operador', '==', loggedInUser)
            .where('timestamp', '>=', startOfDay)
            .where('timestamp', '<', endOfDay)
            .get();

        if (vendasSnapshot.empty) {
            resumoContent.innerHTML = '<p>Nenhuma venda encontrada para hoje.</p>';
            console.log('Nenhuma venda encontrada no snapshot.');
            return;
        }

        // Inicializa os totais
        let totalVendas = 0;
        let totalItens = 0;
        const totaisPorPagamento = {
            pix: 0,
            credito: 0,
            debito: 0,
            dinheiro: 0,
            brinde: 0 // Para contar cortesias
        };

        vendasSnapshot.forEach(doc => {
            const venda = doc.data();
            
            // Somar valor total da venda (apenas se não for brinde)
            if (venda.tipo !== 'BRINDE') {
                totalVendas += venda.valorTotal || 0;
            }
            
            // Somar a quantidade de itens
            if (venda.itens && Array.isArray(venda.itens)) {
                totalItens += venda.itens.reduce((acc, item) => acc + (item.quantidade || 0), 0);
            }

            // Somar os valores por tipo de pagamento
            if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
                venda.pagamentos.forEach(pagamento => {
                    const tipo = pagamento.tipo.toLowerCase();
                    const valor = pagamento.valor || 0;

                    if (tipo.includes('pix')) {
                        totaisPorPagamento.pix += valor;
                    } else if (tipo.includes('credito')) {
                        totaisPorPagamento.credito += valor;
                    } else if (tipo.includes('debito')) {
                        totaisPorPagamento.debito += valor;
                    } else if (tipo.includes('dinheiro')) {
                        totaisPorPagamento.dinheiro += valor;
                    } else if (tipo.includes('brinde')) {
                        totaisPorPagamento.brinde += valor;
                    }
                });
            }
        });

        const trocoInicial = parseFloat(sessionStorage.getItem('trocoInicial') || '0');
        const totalDinheiroComTroco = totaisPorPagamento.dinheiro + trocoInicial;

        // --- Renderização do Resumo ---

        const formatarPreco = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

        resumoContent.innerHTML = `
            <div class="fechamento-info" style="margin-bottom: 20px; text-align: center; font-size: 0.9em; color: var(--text-muted);">
                <p><strong>UNIDADE SP</strong></p>
                <p>FECHAMENTO CAIXA</p>
                <p>Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
                <p>Operador: <strong>${loggedInUser.toUpperCase()}</strong></p>
            </div>

            <div class="carrinho-total" style="border-top: 1px dashed var(--border-color); padding-top: 15px; margin-bottom: 15px;">
                <span>TOTAL DE ITENS:</span>
                <span class="valor">${totalItens}</span>
            </div>

            <div class="carrinho-total" style="font-size: 1.4em;">
                <span>TOTAL DE VENDAS:</span>
                <span class="valor">${formatarPreco(totalVendas)}</span>
            </div>

            <div class="fechamento-detalhes" style="margin-top: 25px; border-top: 1px dashed var(--border-color); padding-top: 15px;">
                <h3 style="text-align: center; margin-bottom: 20px;">DETALHES POR PAGAMENTO</h3>
                
                <div class="carrinho-total">
                    <span>PIX:</span>
                    <span class="valor">${formatarPreco(totaisPorPagamento.pix)}</span>
                </div>
                <div class="carrinho-total">
                    <span>CRÉDITO:</span>
                    <span class="valor">${formatarPreco(totaisPorPagamento.credito)}</span>
                </div>
                <div class="carrinho-total">
                    <span>DÉBITO:</span>
                    <span class="valor">${formatarPreco(totaisPorPagamento.debito)}</span>
                </div>
                <div class="carrinho-total">
                    <span>DINHEIRO (Vendas):</span>
                    <span class="valor">${formatarPreco(totaisPorPagamento.dinheiro)}</span>
                </div>

                ${totaisPorPagamento.brinde > 0 ? `
                <div class="carrinho-total" style="color: var(--blue-info);">
                    <span>CORTESIAS (Brindes):</span>
                    <span class="valor">${formatarPreco(totaisPorPagamento.brinde)}</span>
                </div>` : ''}

                 <div style="border-top: 1px solid var(--border-color); margin: 15px 0;"></div>

                <div class="carrinho-total" style="font-size: 1.1em;">
                    <span>Troco Inicial:</span>
                    <span class="valor">${formatarPreco(trocoInicial)}</span>
                </div>
                <div class="carrinho-total" style="font-size: 1.2em; font-weight: bold;">
                    <span>DINHEIRO EM CAIXA:</span>
                    <span class="valor">${formatarPreco(totalDinheiroComTroco)}</span>
                </div>

            </div>

            <div style="text-align: center; margin-top: 30px;">
                 <button onclick="window.print();" class="btn-primary" style="width: 100%; padding: 15px;">IMPRIMIR FECHAMENTO</button>
            </div>
        `;

    } catch (error) {
        console.error('Erro ao buscar ou processar vendas:', error);
        resumoContent.innerHTML = `<p style='color: var(--red-error);'>Ocorreu um erro ao gerar o resumo. Verifique o console para mais detalhes.</p>`;
    }
});