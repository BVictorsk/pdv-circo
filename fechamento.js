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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfDay = today;

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endOfDay = tomorrow;

        const vendasSnapshot = await db.collection('vendas')
            .where('operador', '==', loggedInUser)
            .where('timestamp', '>=', startOfDay)
            .where('timestamp', '<', endOfDay)
            .get();

        if (vendasSnapshot.empty) {
            resumoContent.innerHTML = '<p>Nenhuma venda encontrada para hoje.</p>';
            document.getElementById('conferencia-container').style.display = 'none';
            return;
        }

        let totalVendas = 0;
        let totalItens = 0;
        const totaisPorPagamento = { pix: 0, credito: 0, debito: 0, dinheiro: 0, brinde: 0 };
        const produtosVendidos = {};

        vendasSnapshot.forEach(doc => {
            const venda = doc.data();

            if (venda.tipo !== 'BRINDE') {
                totalVendas += venda.valorTotal || 0;
            }

            if (venda.itens && Array.isArray(venda.itens)) {
                venda.itens.forEach(item => {
                    const quantidade = item.quantidade || 0;
                    totalItens += quantidade;
                    
                    const nome = item.nome;
                    const preco = item.preco || 0;

                    if (produtosVendidos[nome]) {
                        produtosVendidos[nome].quantidade += quantidade;
                        produtosVendidos[nome].valorTotal += preco * quantidade;
                    } else {
                        produtosVendidos[nome] = {
                            quantidade: quantidade,
                            valorTotal: preco * quantidade
                        };
                    }
                });
            }

            if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
                venda.pagamentos.forEach(pagamento => {
                    const tipo = pagamento.tipo.toLowerCase();
                    const valor = pagamento.valor || 0;
                    if (tipo.includes('pix')) totaisPorPagamento.pix += valor;
                    else if (tipo.includes('credito')) totaisPorPagamento.credito += valor;
                    else if (tipo.includes('debito')) totaisPorPagamento.debito += valor;
                    else if (tipo.includes('dinheiro')) totaisPorPagamento.dinheiro += valor;
                    else if (tipo.includes('brinde')) totaisPorPagamento.brinde += valor;
                });
            }
        });

        const trocoInicial = parseFloat(sessionStorage.getItem('trocoInicial') || '0');
        const totalDinheiroComTroco = totaisPorPagamento.dinheiro + trocoInicial;
        const formatarPreco = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

        const produtosHTML = Object.keys(produtosVendidos).length > 0 ?
            `<div class="fechamento-detalhes" style="margin-top: 25px; border-top: 1px dashed var(--border-color); padding-top: 15px;">
                <h3 style="text-align: center; margin-bottom: 20px;">PRODUTOS VENDIDOS</h3>
                ${Object.keys(produtosVendidos).sort().map(nome => {
                    const produto = produtosVendidos[nome];
                    return `
                        <div class="carrinho-total">
                            <span>${produto.quantidade}x ${nome}</span>
                            <span class="valor">${formatarPreco(produto.valorTotal)}</span>
                        </div>
                    `;
                }).join('')}
            </div>` : '';

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
            ${produtosHTML}
            <div class="fechamento-detalhes" style="margin-top: 25px; border-top: 1px dashed var(--border-color); padding-top: 15px;">
                <h3 style="text-align: center; margin-bottom: 20px;">DETALHES POR PAGAMENTO</h3>
                <div class="carrinho-total"><span>PIX:</span><span class="valor">${formatarPreco(totaisPorPagamento.pix)}</span></div>
                <div class="carrinho-total"><span>CRÉDITO:</span><span class="valor">${formatarPreco(totaisPorPagamento.credito)}</span></div>
                <div class="carrinho-total"><span>DÉBITO:</span><span class="valor">${formatarPreco(totaisPorPagamento.debito)}</span></div>
                <div class="carrinho-total"><span>DINHEIRO (Vendas):</span><span class="valor">${formatarPreco(totaisPorPagamento.dinheiro)}</span></div>
                ${totaisPorPagamento.brinde > 0 ? `<div class="carrinho-total" style="color: var(--blue-info);"><span>CORTESIAS (Brindes):</span><span class="valor">${formatarPreco(totaisPorPagamento.brinde)}</span></div>` : ''}
            </div>
            <div style="border-top: 1px solid var(--border-color); margin: 15px 0; padding-top: 15px;">
                <div class="carrinho-total" style="font-size: 1.1em;"><span>Troco Inicial:</span><span class="valor">${formatarPreco(trocoInicial)}</span></div>
                <div class="carrinho-total" style="font-size: 1.2em; font-weight: bold;"><span>DINHEIRO EM CAIXA:</span><span class="valor">${formatarPreco(totalDinheiroComTroco)}</span></div>
            </div>
        `;

        // Lógica de Conferência
        const sistemaPix = document.getElementById('sistema-pix');
        const sistemaCredito = document.getElementById('sistema-credito');
        const sistemaDebito = document.getElementById('sistema-debito');
        const sistemaDinheiro = document.getElementById('sistema-dinheiro');

        sistemaPix.textContent = formatarPreco(totaisPorPagamento.pix);
        sistemaCredito.textContent = formatarPreco(totaisPorPagamento.credito);
        sistemaDebito.textContent = formatarPreco(totaisPorPagamento.debito);
        sistemaDinheiro.textContent = formatarPreco(totaisPorPagamento.dinheiro);

        const inputsApurados = {
            pix: document.getElementById('apurado-pix'),
            credito: document.getElementById('apurado-credito'),
            debito: document.getElementById('apurado-debito'),
            dinheiro: document.getElementById('apurado-dinheiro')
        };

        const diferencaSpans = {
            pix: document.getElementById('diferenca-pix'),
            credito: document.getElementById('diferenca-credito'),
            debito: document.getElementById('diferenca-debito'),
            dinheiro: document.getElementById('diferenca-dinheiro')
        };

        function calcularDiferenca(tipo) {
            const valorApurado = parseFloat(inputsApurados[tipo].value) || 0;
            const valorSistema = totaisPorPagamento[tipo];
            const diferenca = valorApurado - valorSistema;

            const spanDiferenca = diferencaSpans[tipo];
            spanDiferenca.textContent = formatarPreco(diferenca);
            spanDiferenca.classList.remove('positiva', 'negativa');

            if (diferenca > 0) {
                spanDiferenca.classList.add('positiva');
            } else if (diferenca < 0) {
                spanDiferenca.classList.add('negativa');
            }
        }

        Object.keys(inputsApurados).forEach(tipo => {
            inputsApurados[tipo].addEventListener('input', () => calcularDiferenca(tipo));
        });

        // Lógica de Impressão
        const btnImprimir = document.getElementById('btn-imprimir');
        btnImprimir.addEventListener('click', () => {
            const dataHora = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');

            let produtosPrintHTML = '';
            const sortedProdutos = Object.keys(produtosVendidos).sort();
            if (sortedProdutos.length > 0) {
                produtosPrintHTML += '<div style="border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px;"><h3>PRODUTOS VENDIDOS</h3>';
                sortedProdutos.forEach(nome => {
                    const produto = produtosVendidos[nome];
                    produtosPrintHTML += `<div style="display: flex; justify-content: space-between;"><span>${produto.quantidade}x ${nome}</span><span>${formatarPreco(produto.valorTotal)}</span></div>`;
                });
                produtosPrintHTML += '</div>';
            }

            const apuradoPix = parseFloat(inputsApurados.pix.value) || 0;
            const apuradoCredito = parseFloat(inputsApurados.credito.value) || 0;
            const apuradoDebito = parseFloat(inputsApurados.debito.value) || 0;
            const apuradoDinheiro = parseFloat(inputsApurados.dinheiro.value) || 0;

            const conferenciaHTML = `
                <div style="border-top: 2px solid #000; padding-top: 15px; margin-top: 20px;">
                    <h2 style="text-align: center; margin-bottom: 15px;">CONFERÊNCIA DE VALORES</h2>
                    <div style="margin-bottom: 10px;">
                        <strong>PIX</strong>
                        <div style="display: flex; justify-content: space-between;"><span>Sistema:</span><span>${formatarPreco(totaisPorPagamento.pix)}</span></div>
                        <div style="display: flex; justify-content: space-between;"><span>Apurado:</span><span>${formatarPreco(apuradoPix)}</span></div>
                        <div style="display: flex; justify-content: space-between;"><strong>Diferença:</strong><strong>${diferencaSpans.pix.textContent}</strong></div>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>CRÉDITO</strong>
                        <div style="display: flex; justify-content: space-between;"><span>Sistema:</span><span>${formatarPreco(totaisPorPagamento.credito)}</span></div>
                        <div style="display: flex; justify-content: space-between;"><span>Apurado:</span><span>${formatarPreco(apuradoCredito)}</span></div>
                        <div style="display: flex; justify-content: space-between;"><strong>Diferença:</strong><strong>${diferencaSpans.credito.textContent}</strong></div>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>DÉBITO</strong>
                        <div style="display: flex; justify-content: space-between;"><span>Sistema:</span><span>${formatarPreco(totaisPorPagamento.debito)}</span></div>
                        <div style="display: flex; justify-content: space-between;"><span>Apurado:</span><span>${formatarPreco(apuradoDebito)}</span></div>
                        <div style="display: flex; justify-content: space-between;"><strong>Diferença:</strong><strong>${diferencaSpans.debito.textContent}</strong></div>
                    </div>
                    <div>
                        <strong>DINHEIRO</strong>
                        <div style="display: flex; justify-content: space-between;"><span>Sistema (Vendas):</span><span>${formatarPreco(totaisPorPagamento.dinheiro)}</span></div>
                        <div style="display: flex; justify-content: space-between;"><span>Apurado (Caixa):</span><span>${formatarPreco(apuradoDinheiro)}</span></div>
                        <div style="display: flex; justify-content: space-between;"><strong>Diferença:</strong><strong>${diferencaSpans.dinheiro.textContent}</strong></div>
                    </div>
                </div>
            `;

            const printWindowHTML = `
                <html>
                <head>
                    <title>Fechamento de Caixa - ${dataHora}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; color: #000; width: 300px; font-size: 0.9em; }
                        h1, h2, h3 { margin: 0; text-align: center; }
                        h1 { font-size: 1.2em; margin-bottom: 5px; }
                        h3 { font-size: 1em; text-align: left; border-bottom: none; margin-top: 10px; }
                        .info { text-align: center; font-size: 0.8em; margin-bottom: 10px; }
                        .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
                        .detalhe { display: flex; justify-content: space-between; }
                    </style>
                </head>
                <body>
                    <h1>UNIDADE SP</h1>
                    <div class="info">
                        FECHAMENTO CAIXA<br>
                        Data: ${dataHora}<br>
                        Operador: <strong>${loggedInUser.toUpperCase()}</strong>
                    </div>
                    <div class="total"><span>TOTAL DE ITENS:</span><span>${totalItens}</span></div>
                    <div class="total" style="font-size: 1.2em;"><span>TOTAL DE VENDAS:</span><span>${formatarPreco(totalVendas)}</span></div>
                    ${produtosPrintHTML}
                    <div style="border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px;">
                        <h3>PAGAMENTOS (SISTEMA)</h3>
                        <div class="detalhe"><span>PIX:</span><span>${formatarPreco(totaisPorPagamento.pix)}</span></div>
                        <div class="detalhe"><span>CRÉDITO:</span><span>${formatarPreco(totaisPorPagamento.credito)}</span></div>
                        <div class="detalhe"><span>DÉBITO:</span><span>${formatarPreco(totaisPorPagamento.debito)}</span></div>
                        <div class="detalhe"><span>DINHEIRO (Vendas):</span><span>${formatarPreco(totaisPorPagamento.dinheiro)}</span></div>
                         ${totaisPorPagamento.brinde > 0 ? `<div class="detalhe"><span>CORTESIAS:</span><span>${formatarPreco(totaisPorPagamento.brinde)}</span></div>` : ''}
                    </div>
                     <div style="border-top: 1px solid #000; margin-top: 10px; padding-top: 5px; font-size: 1.1em;">
                        <div class="detalhe"><span>Troco Inicial:</span><span>${formatarPreco(trocoInicial)}</span></div>
                        <div class="detalhe" style="font-weight: bold;"><span>DINHEIRO EM CAIXA:</span><span>${formatarPreco(totalDinheiroComTroco)}</span></div>
                    </div>
                    ${conferenciaHTML}
                </body>
                </html>
            `;

            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            
            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(printWindowHTML);
            doc.close();

            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                document.body.removeChild(iframe);
            }, 250);
        });

    } catch (error) {
        console.error('Erro ao buscar ou processar vendas:', error);
        resumoContent.innerHTML = `<p style='color: var(--red-error);'>Ocorreu um erro ao gerar o resumo. Verifique o console para mais detalhes.</p>`;
        document.getElementById('conferencia-container').style.display = 'none';
    }
});