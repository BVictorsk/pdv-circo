document.addEventListener('DOMContentLoaded', async () => {
    const db = firebase.firestore();
    const userDisplay = document.getElementById('user-display');
    const transacaoDetalhesContainer = document.getElementById('transacao-detalhes');
    const itensVendaContainer = document.getElementById('itens-venda-container');
    const catalogoProdutosContainer = document.getElementById('catalogo-produtos-container');
    const searchCatalogoInput = document.getElementById('search-catalogo');
    const btnSalvar = document.getElementById('btn-salvar');
    const valorOriginalDisplay = document.getElementById('valor-original-display');
    const novoValorDisplay = document.getElementById('novo-valor-display');
    const diferencaDisplay = document.getElementById('diferenca-display');

    const pagamentoModal = document.getElementById('pagamentoDiferencaModal');
    const closeModalButton = document.getElementById('close-pagamento-modal');
    const valorDiferencaPagar = document.getElementById('valor-diferenca-pagar');
    const opcoesPagamentoContainer = document.getElementById('opcoes-pagamento-diferenca');
    const campoValorPago = document.getElementById('campo-valor-pago');
    const valorPagoInput = document.getElementById('valor-pago-input');
    const trocoDiferencaDisplay = document.getElementById('troco-diferenca-display');
    const btnConfirmarDinheiro = document.getElementById('btn-confirmar-dinheiro');

    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const vendaId = sessionStorage.getItem('editVendaId');
    let valorOriginalDaCompra;
    let itensOriginais = [];
    let itensEdicao = [];
    let catalogoProdutos = [];
    let pagamentosDaDiferenca = [];

    const formatarPreco = (valor) => `R$ ${typeof valor === 'number' ? valor.toFixed(2).replace('.', ',') : '0,00'}`;

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
                    <input type="number" class="item-qty-input" data-index="${index}" value="${item.quantidade}" min="0" style="width: 50px;">
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
            produtoEl.innerHTML = `<span>${produto.nome} (${formatarPreco(produto.preco)})</span><button class="btn-adicionar-item" data-id="${produto.id}">Adicionar</button>`;
            catalogoProdutosContainer.appendChild(produtoEl);
        });
    }

    function recalcularValores() {
        const novoTotal = itensEdicao.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        const diferenca = novoTotal - valorOriginalDaCompra;
        valorOriginalDisplay.textContent = formatarPreco(valorOriginalDaCompra);
        novoValorDisplay.textContent = formatarPreco(novoTotal);
        diferencaDisplay.textContent = formatarPreco(diferenca);
        diferencaDisplay.classList.toggle('diferenca-positiva', diferenca > 0);
        diferencaDisplay.classList.toggle('diferenca-negativa', diferenca < 0);
        if (diferenca > 0) diferencaDisplay.textContent += " (a pagar)";
        else if (diferenca < 0) diferencaDisplay.textContent = `${formatarPreco(diferenca * -1)} (troco)`;
    }

    function calcularItensImpressaoTroca() {
        const itensImpressao = [];
        const mapaItensEdicao = new Map(itensEdicao.map(item => [item.id, item.quantidade]));
        const mapaItensOriginais = new Map(itensOriginais.map(item => [item.id, item.quantidade]));
        const todosOsIds = new Set([...mapaItensEdicao.keys(), ...mapaItensOriginais.keys()]);

        todosOsIds.forEach(id => {
            const qtdEdicao = mapaItensEdicao.get(id) || 0;
            const qtdOriginal = mapaItensOriginais.get(id) || 0;
            const diferencaQtd = qtdEdicao - qtdOriginal;

            if (diferencaQtd !== 0) {
                const itemInfo = itensEdicao.find(item => item.id === id) || itensOriginais.find(item => item.id === id);
                if (itemInfo) {
                    itensImpressao.push({
                        nome: itemInfo.nome,
                        quantidade: diferencaQtd,
                        precoUnitario: itemInfo.preco
                    });
                }
            }
        });
        return itensImpressao;
    }

    function abrirModalPagamento(diferenca) {
        valorDiferencaPagar.textContent = formatarPreco(diferenca);
        pagamentoModal.style.display = 'flex';
        campoValorPago.style.display = 'none';
        valorPagoInput.value = '';
        trocoDiferencaDisplay.textContent = formatarPreco(0);
        pagamentosDaDiferenca = [];
    }

    function fecharModalPagamento() {
        pagamentoModal.style.display = 'none';
    }

    async function processarPagamento(tipo) {
        const diferenca = itensEdicao.reduce((acc, item) => acc + (item.preco * item.quantidade), 0) - valorOriginalDaCompra;
        if (tipo === 'Dinheiro') {
            campoValorPago.style.display = 'block';
            valorPagoInput.focus();
            valorPagoInput.oninput = () => {
                const pago = parseFloat(valorPagoInput.value) || 0;
                const troco = pago - diferenca;
                trocoDiferencaDisplay.textContent = formatarPreco(troco > 0 ? troco : 0);
            };
            btnConfirmarDinheiro.onclick = () => {
                const pago = parseFloat(valorPagoInput.value) || 0;
                if (pago >= diferenca) {
                    pagamentosDaDiferenca.push({ tipo: 'Dinheiro', valor: diferenca });
                    finalizarEdicao(0, pago - diferenca);
                    fecharModalPagamento();
                } else {
                    alert("Valor pago é insuficiente!");
                }
            };
        } else {
            pagamentosDaDiferenca.push({ tipo: tipo, valor: diferenca });
            finalizarEdicao(0, 0);
            fecharModalPagamento();
        }
    }

    async function handleSaveChanges() {
        const novoTotal = itensEdicao.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        const diferenca = novoTotal - valorOriginalDaCompra;

        if (diferenca > 0) {
            abrirModalPagamento(diferenca);
        } else {
            finalizarEdicao(diferenca < 0 ? Math.abs(diferenca) : 0, 0);
        }
    }

    async function finalizarEdicao(troco, trocoPagamentoDiferenca) {
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';
        const novoTotal = itensEdicao.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

        const itensParaImprimir = calcularItensImpressaoTroca();

        try {
            await db.collection("vendas").doc(vendaId).update({
                itens: itensEdicao,
                valorTotal: novoTotal,
                valorOriginalTroca: valorOriginalDaCompra,
                itensAnteriores: itensOriginais,
                pagamentosDiferenca: pagamentosDaDiferenca,
                ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
            });

            btnSalvar.textContent = 'Salvo com Sucesso';
            btnSalvar.disabled = true; 

            const backLink = document.createElement('a');
            backLink.href = 'minhas_transacoes.html';
            backLink.textContent = 'Voltar para Minhas Transações';
            backLink.className = 'btn-header'; 
            document.querySelector('.btn-salvar-cancelar-container').appendChild(backLink);

            if (itensParaImprimir.length > 0 && typeof imprimirRecibo !== 'undefined') {
                const diferencaCalculada = novoTotal - valorOriginalDaCompra;

                imprimirRecibo(
                    `${vendaId}-TROCA-${Date.now()}`,
                    itensParaImprimir,
                    diferencaCalculada,
                    pagamentosDaDiferenca,
                    trocoPagamentoDiferenca > 0 ? trocoPagamentoDiferenca : troco,
                    formatarPreco,
                    loggedInUser,
                    "COMPROVANTE DE TROCA"
                );
            }

        } catch (error) {
            console.error("Erro ao salvar as alterações:", error);
            alert(`Ocorreu um erro ao salvar a troca: ${error.message}`);
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar Alterações';
        }
    }

    itensVendaContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('item-qty-input')) {
            const index = parseInt(e.target.dataset.index, 10);
            const novaQuantidade = parseInt(e.target.value, 10);
            if (!isNaN(novaQuantidade) && novaQuantidade > 0) {
                itensEdicao[index].quantidade = novaQuantidade;
            } else {
                itensEdicao.splice(index, 1);
            }
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
                if (itemExistente) {
                    itemExistente.quantidade++;
                } else {
                    itensEdicao.push({ ...produtoToAdd, quantidade: 1 });
                }
                renderItensVenda();
            }
        }
    });

    searchCatalogoInput.addEventListener('input', (e) => renderCatalogo(e.target.value));
    btnSalvar.addEventListener('click', handleSaveChanges);
    closeModalButton.addEventListener('click', fecharModalPagamento);
    opcoesPagamentoContainer.addEventListener('click', (e) => {
        if (e.target.matches('.btn-pagamento')) {
            processarPagamento(e.target.dataset.tipo);
        }
    });

    async function initialize() {
        if (userDisplay && loggedInUser) userDisplay.textContent = loggedInUser;
        if (!vendaId) {
            document.querySelector('.admin-main').innerHTML = '<p>Erro: Sessão inválida.</p>';
            return;
        }
        try {
            const vendaDoc = await db.collection("vendas").doc(vendaId).get();
            if (!vendaDoc.exists) throw new Error('Venda não encontrada');
            const vendaData = vendaDoc.data();
            valorOriginalDaCompra = vendaData.valorOriginalTroca !== undefined ? vendaData.valorOriginalTroca : vendaData.valorTotal;
            itensOriginais = JSON.parse(JSON.stringify(vendaData.itens));
            itensEdicao = JSON.parse(JSON.stringify(vendaData.itens));
            const produtosSnapshot = await db.collection("produtos").get();
            catalogoProdutos = produtosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderDetalhesBasicos();
            renderItensVenda();
            renderCatalogo();
        } catch (error) {
            console.error("Erro ao inicializar:", error);
            document.querySelector('.admin-main').innerHTML = `<p>Ocorreu um erro: ${error.message}.</p>`;
        }
    }

    initialize();
});
