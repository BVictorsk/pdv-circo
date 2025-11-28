document.addEventListener('DOMContentLoaded', async () => {
    const userDisplay = document.getElementById('user-display');
    const transacaoDetalhesContainer = document.getElementById('transacao-detalhes');
    const itensVendaContainer = document.getElementById('itens-venda-container');
    const catalogoProdutosContainer = document.getElementById('catalogo-produtos-container');
    const searchCatalogoInput = document.getElementById('search-catalogo');
    const btnSalvar = document.getElementById('btn-salvar');

    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const vendaId = sessionStorage.getItem('editVendaId');

    if (userDisplay && loggedInUser) {
        userDisplay.textContent = loggedInUser;
    }

    if (typeof db === 'undefined' || !vendaId) {
        document.querySelector('.admin-main').innerHTML = '<p>Erro: Sessão inválida ou transação não encontrada. Por favor, volte para a página de transações e tente novamente.</p>';
        return;
    }

    let vendaAtual = {};
    let catalogoProdutos = [];

    const formatarPreco = (valor) => `R$ ${typeof valor === 'number' ? valor.toFixed(2).replace('.', ',') : '0,00'}`;
    const formatarData = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        const date = timestamp.toDate();
        return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
    };

    // --- RENDER FUNCTIONS ---
    function renderDetalhesBasicos() {
        transacaoDetalhesContainer.innerHTML = `
            <h3>Detalhes da Venda ID: ${vendaId}</h3>
            <div class="detalhes-venda-card">
                <p><strong>Data:</strong> ${formatarData(vendaAtual.timestamp)}</p>
                <p><strong>Operador:</strong> ${vendaAtual.operador}</p>
                <p><strong>Valor Total Atual:</strong> <span id="valor-total-display">${formatarPreco(vendaAtual.valorTotal)}</span></p>
            </div>`;
    }

    function renderItensVenda() {
        itensVendaContainer.innerHTML = '';
        if (!vendaAtual.itens || vendaAtual.itens.length === 0) {
            itensVendaContainer.innerHTML = '<p>Nenhum item nesta venda.</p>';
            return;
        }

        vendaAtual.itens.forEach((item, index) => {
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
        recalcularTotal();
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
    function recalcularTotal() {
        const novoTotal = vendaAtual.itens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        vendaAtual.valorTotal = novoTotal;
        const valorTotalDisplay = document.getElementById('valor-total-display');
        if(valorTotalDisplay) valorTotalDisplay.textContent = formatarPreco(novoTotal);
    }

    async function handleSaveChanges() {
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';
        recalcularTotal(); // Garante que o total está atualizado

        try {
            await db.collection("vendas").doc(vendaId).update({
                itens: vendaAtual.itens,
                valorTotal: vendaAtual.valorTotal
            });
            alert('Venda atualizada com sucesso!');
            window.location.href = 'minhas_transacoes.html';
        } catch (error) {
            console.error("Erro ao salvar as alterações:", error);
            alert('Ocorreu um erro ao salvar as alterações. Tente novamente.');
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar Alterações';
        }
    }

    // --- EVENT LISTENERS ---
    itensVendaContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('item-qty-input')) {
            const index = parseInt(e.target.dataset.index);
            const novaQuantidade = parseInt(e.target.value);
            if (novaQuantidade > 0) {
                vendaAtual.itens[index].quantidade = novaQuantidade;
                renderItensVenda();
            }
        }
    });

    itensVendaContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remover-item')) {
            const index = parseInt(e.target.dataset.index);
            vendaAtual.itens.splice(index, 1);
            renderItensVenda();
        }
    });

    catalogoProdutosContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-adicionar-item')) {
            const produtoId = e.target.dataset.id;
            const produtoToAdd = catalogoProdutos.find(p => p.id === produtoId);
            
            if (produtoToAdd) {
                const itemExistente = vendaAtual.itens.find(item => item.id === produtoId);
                if (itemExistente) {
                    itemExistente.quantidade++;
                } else {
                    vendaAtual.itens.push({ ...produtoToAdd, quantidade: 1 });
                }
                renderItensVenda();
            }
        }
    });

    searchCatalogoInput.addEventListener('input', (e) => renderCatalogo(e.target.value));
    btnSalvar.addEventListener('click', handleSaveChanges);

    // --- INITIALIZATION ---
    try {
        // Fetch Venda
        const vendaDoc = await db.collection("vendas").doc(vendaId).get();
        if (!vendaDoc.exists) throw new Error('Venda não encontrada');
        vendaAtual = vendaDoc.data();
        vendaAtual.id = vendaDoc.id;

        // Fetch Catalogo
        const produtosSnapshot = await db.collection("produtos").get();
        catalogoProdutos = produtosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Initial Render
        renderDetalhesBasicos();
        renderItensVenda();
        renderCatalogo();

    } catch (error) {
        console.error("Erro ao inicializar a página de edição:", error);
        document.querySelector('.admin-main').innerHTML = `<p>Ocorreu um erro: ${error.message}.</p>`;
    }
});