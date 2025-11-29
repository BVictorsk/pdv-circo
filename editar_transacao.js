
document.addEventListener('DOMContentLoaded', async () => {
    // --- ELEMENT SELECTORS ---
    const userDisplay = document.getElementById('user-display');
    const transacaoDetalhesContainer = document.getElementById('transacao-detalhes');
    const itensVendaContainer = document.getElementById('itens-venda-container');
    const catalogoProdutosContainer = document.getElementById('catalogo-produtos-container');
    const searchCatalogoInput = document.getElementById('search-catalogo');
    const btnSalvar = document.getElementById('btn-salvar');
    const valorOriginalDisplay = document.getElementById('valor-original-display');
    const novoValorDisplay = document.getElementById('novo-valor-display');
    const diferencaDisplay = document.getElementById('diferenca-display');

    // --- SESSION & STATE ---
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const vendaId = sessionStorage.getItem('editVendaId');
    let valorOriginalDaCompra;
    let itensOriginais = []; // "Fotografia" dos itens antes da edição
    let itensEdicao = []; // Itens que estão sendo editados
    let catalogoProdutos = [];
    let vendaOriginalData = {};

    // --- FORMATTERS ---
    const formatarPreco = (valor) => `R$ ${typeof valor === 'number' ? valor.toFixed(2).replace('.', ',') : '0,00'}`;

    // --- RENDER FUNCTIONS ---
    function renderDetalhesBasicos() {
        transacaoDetalhesContainer.innerHTML = `<h3>Editando a Venda ID: ${vendaId}</h3>`;
    }

    function renderItensVenda() {
        itensVendaContainer.innerHTML = '';
        if (!itensEdicao || itensEdicao.length === 0) {
            itensVendaContainer.innerHTML = '<p>Nenhum item selecionado para a troca.</p>';
        }
        itensEdicao.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'item-edicao';
            itemEl.innerHTML = `
                <span>${item.nome} (${formatarPreco(item.preco)})</span>
                <div>
                    <label>Qtd: </label>
                    <input type="number" class="item-qty-input" data-index="${index}" value="${item.quantidade}" min="1" style="width: 50px;">
                    <button class="btn-remover-item" data-index="${index}">Remover</button>
                </div>
            `;
            itensVendaContainer.appendChild(itemEl);
        });
        recalcularValores();
    }

    function renderCatalogo(filtro = '') {
        catalogoProdutosContainer.innerHTML = '';
        const produtosFiltrados = catalogoProdutos.filter(p => p.nome.toLowerCase().includes(filtro.toLowerCase()));
        produtosFiltrados.forEach(produto => {
            const produtoEl = document.createElement('div');
            produtoEl.className = 'catalogo-item';
            produtoEl.innerHTML = `
                <span>${produto.nome} (${formatarPreco(produto.preco)})</span>
                <button class="btn-adicionar-item" data-id="${produto.id}">Adicionar</button>
            `;
            catalogoProdutosContainer.appendChild(produtoEl);
        });
    }

    // --- LOGIC FUNCTIONS ---
    function recalcularValores() {
        const novoTotal = itensEdicao.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        const diferenca = novoTotal - valorOriginalDaCompra;

        valorOriginalDisplay.textContent = formatarPreco(valorOriginalDaCompra);
        novoValorDisplay.textContent = formatarPreco(novoTotal);
        diferencaDisplay.textContent = formatarPreco(diferenca);

        diferencaDisplay.classList.remove('diferenca-positiva', 'diferenca-negativa');
        if (diferenca > 0) {
            diferencaDisplay.classList.add('diferenca-positiva');
            diferencaDisplay.textContent += " (a pagar)";
        } else if (diferenca < 0) {
            diferencaDisplay.classList.add('diferenca-negativa');
            diferencaDisplay.textContent = formatarPreco(diferenca * -1) + " (troco)";
        }
    }

    function calcularItensParaImpressao() {
        const itensParaImprimir = [];
        const mapaItensOriginais = new Map(itensOriginais.map(item => [item.id, item.quantidade]));

        itensEdicao.forEach(itemEditado => {
            const qtdOriginal = mapaItensOriginais.get(itemEditado.id) || 0;
            const diferencaQtd = itemEditado.quantidade - qtdOriginal;

            if (diferencaQtd > 0) {
                itensParaImprimir.push({ ...itemEditado, quantidade: diferencaQtd });
            }
        });

        return itensParaImprimir;
    }

    async function handleSaveChanges() {
        const novoTotal = itensEdicao.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        const diferenca = novoTotal - valorOriginalDaCompra;

        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';

        const itensParaImprimir = calcularItensParaImpressao();

        try {
            await db.collection("vendas").doc(vendaId).update({
                itens: itensEdicao,
                valorTotal: novoTotal,
                valorOriginalTroca: valorOriginalDaCompra,
                itensAnteriores: itensOriginais,
                ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
            });


            btnSalvar.textContent = 'Salvo com Sucesso';
            btnSalvar.disabled = true;

            if (itensParaImprimir.length > 0) {
                if (confirm("Deseja imprimir as fichas dos itens adicionados/alterados?")) {
                    if (typeof imprimirRecibo !== 'undefined') {
                        const pagamentos = [{ forma: 'TROCA', valor: novoTotal }];
                        const troco = valorOriginalDaCompra - novoTotal;
                        imprimirRecibo(vendaId, itensParaImprimir, novoTotal, pagamentos, troco, formatarPreco, loggedInUser, "COMPROVANTE DE TROCA");
                    } else {
                         console.error("Erro: Função 'imprimirRecibo' não encontrada. Certifique-se de que print.js está carregado.");
                    }
                }
            }

        } catch (error) {
            console.error("Erro ao salvar as alterações:", error);
            alert('Ocorreu um erro ao salvar a troca. Tente novamente.');
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar Alterações';
        }
    }

    // --- EVENT LISTENERS ---
    itensVendaContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('item-qty-input')) {
            const index = parseInt(e.target.dataset.index);
            const novaQuantidade = parseInt(e.target.value);
            if (novaQuantidade > 0) itensEdicao[index].quantidade = novaQuantidade;
            renderItensVenda();
        }
    });

    itensVendaContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remover-item')) {
            const index = parseInt(e.target.dataset.index);
            itensEdicao.splice(index, 1);
            renderItensVenda();
        }
    });

    catalogoProdutosContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-adicionar-item')) {
            const produtoId = e.target.dataset.id;
            const produtoToAdd = catalogoProdutos.find(p => p.id === produtoId);
            if (produtoToAdd) {
                const itemExistente = itensEdicao.find(item => item.id === produtoId);
                if (itemExistente) itemExistente.quantidade++;
                else itensEdicao.push({ ...produtoToAdd, quantidade: 1 });
                renderItensVenda();
            }
        }
    });

    searchCatalogoInput.addEventListener('input', (e) => renderCatalogo(e.target.value));
    btnSalvar.addEventListener('click', handleSaveChanges);

    // --- INITIALIZATION ---
    async function initialize() {
        if (userDisplay && loggedInUser) userDisplay.textContent = loggedInUser;
        if (!vendaId) {
            document.querySelector('.admin-main').innerHTML = '<p>Erro: Sessão inválida ou transação não encontrada.</p>';
            return;
        }

        try {
            const vendaDoc = await db.collection("vendas").doc(vendaId).get();
            if (!vendaDoc.exists) throw new Error('Venda não encontrada');
            const vendaData = vendaDoc.data();
            vendaOriginalData = vendaData;

            valorOriginalDaCompra = vendaData.valorOriginalTroca !== undefined ? vendaData.valorOriginalTroca : vendaData.valorTotal;

            itensOriginais = JSON.parse(JSON.stringify(vendaData.itens));
            itensEdicao = JSON.parse(JSON.stringify(vendaData.itens));

            const produtosSnapshot = await db.collection("produtos").get();
            catalogoProdutos = produtosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            renderDetalhesBasicos();
            renderItensVenda();
            renderCatalogo();
        } catch (error) {
            console.error("Erro ao inicializar a página de edição:", error);
            document.querySelector('.admin-main').innerHTML = `<p>Ocorreu um erro: ${error.message}.</p>`;
        }
    }

    initialize();
});