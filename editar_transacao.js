// editar_transacao.js

document.addEventListener('DOMContentLoaded', async () => {
    const userDisplay = document.getElementById('user-display');
    const editingSaleIdDisplay = document.getElementById('editing-sale-id');
    const originalTotalValueDisplay = document.getElementById('original-total-value');
    const newTotalValueDisplay = document.getElementById('new-total-value');
    const differentialValueDisplay = document.getElementById('differential-value');

    const acessoRapidoGrid = document.getElementById('acesso-rapido-grid');
    const outrosProdutosGrid = document.getElementById('outros-produtos-grid');
    const carrinhoLista = document.getElementById('carrinho-lista');

    const btnSalvarEdicao = document.getElementById('btn-salvar-edicao');
    const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao');

    const buscaProdutoInput = document.getElementById('busca-produto-input');
    const btnLimparBusca = document.getElementById('btn-limpar-busca');

    let currentEditingSale = null;
    let carrinhoEdicao = []; // O carrinho que estamos editando
    let allProducts = []; // Catálogo completo de produtos

    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (userDisplay && loggedInUser) {
        userDisplay.textContent = loggedInUser;
    }

    if (typeof db === 'undefined' || db === null) {
        console.error("Error: Firestore 'db' object is not defined or null. Ensure firebase-config.js is loaded correctly.");
        return;
    }

    const formatarPreco = (valor) => `R$ ${typeof valor === 'number' ? valor.toFixed(2).replace('.', ',') : '0,00'}`;

    // Função de formatação de valor monetário (copiada do script.js ou portal_admin.js)
    function formatarValorMonetarioAoDigitar(event) {
        let input = event.target;
        let val = input.value.replace(/\D/g, "");

        if (!val) {
            input.value = "";
            return;
        }

        while (val.length < 3) {
            val = "0" + val;
        }

        let inteiro = val.slice(0, -2);
        let decimal = val.slice(-2);
        inteiro = inteiro.replace(/^0+(?=\d)/, "");

        input.value = `${inteiro},${decimal}`;
    }

    async function fetchProducts() {
        try {
            const snapshot = await db.collection("produtos").get();
            allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderizarProdutos();
        } catch (error) {
            console.error("Erro ao carregar catálogo de produtos:", error);
            allProducts = [];
        }
    }

    async function loadSaleForEdit() {
        const vendaId = sessionStorage.getItem('editVendaId');
        if (!vendaId) {
            console.error("Nenhuma venda selecionada para edição.");
            window.location.href = 'minhas_transacoes.html'; // Redireciona de volta
            return;
        }

        try {
            const vendaDoc = await db.collection("vendas").doc(vendaId).get();
            if (vendaDoc.exists) {
                currentEditingSale = { id: vendaDoc.id, ...vendaDoc.data() };
                carrinhoEdicao = JSON.parse(JSON.stringify(currentEditingSale.itens)); // Clona os itens para edição

                editingSaleIdDisplay.textContent = currentEditingSale.id.substring(0, 8) + '...';
                originalTotalValueDisplay.textContent = formatarPreco(currentEditingSale.valorTotal);
                
                renderizarCarrinhoEdicao();
                calcularTotaisEdicao();
            } else {
                console.error("Venda não encontrada para o ID:", vendaId);
                sessionStorage.removeItem('editVendaId');
                window.location.href = 'minhas_transacoes.html';
            }
        } catch (error) {
            console.error("Erro ao carregar venda para edição:", error);
            sessionStorage.removeItem('editVendaId');
            window.location.href = 'minhas_transacoes.html';
        }
    }

    function renderizarCarrinhoEdicao() {
        if (!carrinhoLista) return;

        if (carrinhoEdicao.length === 0) {
            carrinhoLista.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 50px;">Carrinho de edição vazio.</p>';
        } else {
            carrinhoLista.innerHTML = '';
            carrinhoEdicao.forEach(item => {
                const listItem = document.createElement('div');
                listItem.classList.add('carrinho-item');
                listItem.innerHTML = `
                    <div class="item-header">${item.nome}</div>
                    <div class="item-footer">
                        <div class="item-acoes-esquerda">
                             <button class="btn-controle btn-cancelar-item" data-id="${item.id}" data-acao="cancelarItem">
                                &times;
                            </button>
                            <div class="item-preco-qtde">
                                ${formatarPreco(item.preco)} x ${item.quantidade}
                            </div>
                        </div>
                        <div class="item-controles-direita">
                            <button class="btn-controle btn-controle-diminuir" data-id="${item.id}" data-acao="diminuir">
                                -
                            </button>
                            <span class="quantidade-display">${item.quantidade}</span>
                            <button class="btn-controle" data-id="${item.id}" data-acao="aumentar">
                                +
                            </button>
                        </div>
                    </div>
                `;
                carrinhoLista.appendChild(listItem);
            });
        }

        // Re-add event listeners for quantity controls
        carrinhoLista.querySelectorAll('.btn-controle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.currentTarget.dataset.id;
                const acao = e.currentTarget.dataset.acao;
                manipularQuantidadeCarrinhoEdicao(itemId, acao);
            });
        });

        calcularTotaisEdicao();
    }

    function manipularQuantidadeCarrinhoEdicao(itemId, acao) {
        const index = carrinhoEdicao.findIndex(item => item.id === itemId);

        if (index > -1) {
            if (acao === 'aumentar') {
                carrinhoEdicao[index].quantidade += 1;
            } else if (acao === 'diminuir') {
                carrinhoEdicao[index].quantidade -= 1;
            } else if (acao === 'cancelarItem') {
                carrinhoEdicao.splice(index, 1);
            }

            if (carrinhoEdicao[index] && carrinhoEdicao[index].quantidade <= 0) {
                carrinhoEdicao.splice(index, 1);
            }
            renderizarCarrinhoEdicao();
        }
    }

    function calcularTotaisEdicao() {
        const newTotal = carrinhoEdicao.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        newTotalValueDisplay.textContent = formatarPreco(newTotal);

        const originalTotal = currentEditingSale ? currentEditingSale.valorTotal : 0;
        const differential = newTotal - originalTotal;
        differentialValueDisplay.textContent = formatarPreco(differential);
        differentialValueDisplay.style.color = differential >= 0 ? 'green' : 'red';
    }

    function adicionarAoCarrinhoEdicao(produto) {
        const itemExistente = carrinhoEdicao.find(item => item.id === produto.id);

        if (itemExistente) {
            itemExistente.quantidade += 1;
        } else {
            carrinhoEdicao.push({ ...produto, quantidade: 1 });
        }
        renderizarCarrinhoEdicao();
    }

    const renderizarProdutos = (filtro = '') => {
        if (!acessoRapidoGrid || !outrosProdutosGrid) return;

        acessoRapidoGrid.innerHTML = '';
        outrosProdutosGrid.innerHTML = '';

        const termoBusca = filtro.toLowerCase().trim();
        const produtosFiltrados = allProducts.filter(produto => {
            return produto.id.toLowerCase().includes(termoBusca) || produto.nome.toLowerCase().includes(termoBusca);
        });

        produtosFiltrados.forEach(produto => {
            const card = document.createElement('div');
            card.classList.add('produto-card');
            card.setAttribute('data-id', produto.id);

            const precoFormatado = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(produto.preco);
            const acessoRapidoTag = produto.acessoRapido ? '<div class="acesso-rapido-info">⚡</div>' : '';

            card.innerHTML = `
                <div class="card-header">
                    <div class="icone">${produto.icone || '❓'}</div>
                    <div class="product-title-group">
                        <div class="nome">${produto.nome}</div>
                        <div class="product-id-display">ID: ${produto.id}</div>
                    </div>
                </div>
                <div class="card-body">
                    ${acessoRapidoTag}
                    <div class="preco">R$ ${precoFormatado}</div>
                </div>
            `;

            card.addEventListener('click', () => {
                adicionarAoCarrinhoEdicao(produto);
            });

            if (produto.acessoRapido) {
                acessoRapidoGrid.appendChild(card);
            } else {
                outrosProdutosGrid.appendChild(card);
            }
        });

        if (produtosFiltrados.length === 0 && termoBusca !== '') {
            outrosProdutosGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Nenhum produto encontrado.</p>';
            acessoRapidoGrid.innerHTML = '';
        } else if (produtosFiltrados.length === 0 && termoBusca === '') {
            outrosProdutosGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Nenhum produto cadastrado.</p>';
            acessoRapidoGrid.innerHTML = '';
        }
    };

    // Event Listeners para a busca
    if (buscaProdutoInput && btnLimparBusca) {
        buscaProdutoInput.addEventListener('keyup', () => {
            const termoBusca = buscaProdutoInput.value;
            renderizarProdutos(termoBusca);
            if (termoBusca.length > 0) {
                btnLimparBusca.style.display = 'inline-block';
            } else {
                btnLimparBusca.style.display = 'none';
            }
        });

        btnLimparBusca.addEventListener('click', () => {
            buscaProdutoInput.value = '';
            renderizarProdutos('');
            btnLimparBusca.style.display = 'none';
        });
    }

    // Salvar Edição
    btnSalvarEdicao.addEventListener('click', async () => {
        if (!currentEditingSale) return;

        const newTotal = carrinhoEdicao.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        const originalTotal = currentEditingSale.valorTotal;
        const differential = newTotal - originalTotal;

        // Logar a mensagem ao invés de usar confirm
        let logMessage = `Resumo da Edição:\n--------------------------\nTotal Original: ${formatarPreco(originalTotal)}\nNovo Total: ${formatarPreco(newTotal)}\nDiferencial: ${formatarPreco(differential)}\n--------------------------\n`;

        if (differential > 0) {
            logMessage += `O cliente deve pagar a diferença de: ${formatarPreco(differential)}\n`;
        } else if (differential < 0) {
            logMessage += `O cliente deve receber de troco: ${formatarPreco(Math.abs(differential))}\n`;
        }
        logMessage += `Salvando estas alterações. A operação de pagamento ou troco da diferença deve ser feita manualmente.`;

        console.log(logMessage); 

        try {
            await db.collection("vendas").doc(currentEditingSale.id).update({
                itens: carrinhoEdicao,
                valorTotal: newTotal,
                editHistory: firebase.firestore.FieldValue.arrayUnion({
                    timestamp: new Date(),
                    user: loggedInUser || 'unknown',
                    originalTotal: originalTotal,
                    newTotal: newTotal,
                    differential: differential
                })
            });

            console.log("Venda atualizada com sucesso!");
            sessionStorage.removeItem('editVendaId');
            window.location.href = 'minhas_transacoes.html';

        } catch (error) {
            console.error("Erro ao salvar edição da venda:", error);
        }
    });

    // Cancelar Edição
    btnCancelarEdicao.addEventListener('click', () => {
        console.log("Edição cancelada. Todas as alterações serão perdidas.");
        sessionStorage.removeItem('editVendaId');
        window.location.href = 'minhas_transacoes.html';
    });

    // Inicialização
    async function initEditPage() {
        await fetchProducts();
        await loadSaleForEdit();
    }

    initEditPage();
});