
// --- SCRIPT UNIFICADO (LOGIN E PDV) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DA PÁGINA DE LOGIN (executa se encontrar o 'login-form') ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const setorSelect = document.getElementById('setor');

        // Função para carregar os setores do Firestore
        async function carregarSetores() {
            if (!setorSelect) return;

            try {
                if (typeof db === 'undefined' || db === null) {
                    console.error("Erro: Firestore não conectado.");
                    setorSelect.innerHTML = '<option value="">Erro de conexão</option>';
                    return;
                }
                const snapshot = await db.collection("produtos").get();
                const setores = new Set();
                snapshot.forEach(doc => {
                    const produto = doc.data();
                    if (produto.setor && produto.setor.trim() !== '') {
                        setores.add(produto.setor);
                    }
                });

                setorSelect.innerHTML = '<option value="">-- Selecione o Setor --</option>';
                setores.forEach(setor => {
                    const option = document.createElement('option');
                    option.value = setor;
                    option.textContent = setor;
                    setorSelect.appendChild(option);
                });
            } catch (error) {
                console.error("Erro ao carregar setores: ", error);
                setorSelect.innerHTML = '<option value="">Falha ao carregar</option>';
            }
        }

        carregarSetores();

        // Evento de submit do formulário de login
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const usuarioId = document.getElementById('usuario').value;
            const senha = document.getElementById('senha').value;
            const setor = setorSelect.value;

            if (!setor) {
                alert('Por favor, selecione um setor.');
                return;
            }

            try {
                const userDoc = await db.collection("usuarios").doc(usuarioId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.senha === senha) {
                        sessionStorage.setItem('loggedInUser', usuarioId);
                        sessionStorage.setItem('loggedInUserAccessType', userData.tipoAcesso);
                        sessionStorage.setItem('setorLogado', setor);
                        window.location.href = 'pdv.html';
                    } else {
                        alert('Senha incorreta.');
                    }
                } else {
                    alert('Usuário não encontrado.');
                }
            } catch (error) {
                console.error("Erro de autenticação: ", error);
                alert("Erro ao tentar fazer login. Verifique o console.");
            }
        });
    }

    // --- LÓGICA DA PÁGINA DO PDV (executa se encontrar o 'pdv-main') ---
    const pdvMain = document.querySelector('.pdv-main');
    if (pdvMain) {
        // Validação de sessão: se não estiver logado, volta para o index.
        const loggedInUser = sessionStorage.getItem('loggedInUser');
        const setorLogado = sessionStorage.getItem('setorLogado');
        if (!loggedInUser || !setorLogado) {
            window.location.href = 'index.html';
            return;
        }

        // Configuração do botão de logout
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                sessionStorage.clear();
                window.location.href = 'index.html';
            });
        }

        // Exibição de informações do usuário e controle de acesso
        document.getElementById('user-display').textContent = `${loggedInUser} (${setorLogado})`;
        const loggedInUserAccessType = sessionStorage.getItem('loggedInUserAccessType');
        const adminPanelLink = document.getElementById('admin-panel-link');
        if (adminPanelLink && loggedInUserAccessType === 'Operador') {
            adminPanelLink.style.display = 'none';
        }

        // Toda a lógica do PDV que já existia (carrinho, produtos, pagamentos, etc.)
        let carrinho = [];
        let valorTotal = 0;
        let valorPago = 0;
        let produtosDoFirestore = [];

        const carrinhoLista = document.getElementById('carrinho-lista');
        const carrinhoResumoDiv = document.querySelector('.carrinho-resumo');
        
        async function fetchProductsFromFirestore() {
            try {
                const snapshot = await db.collection("produtos").where("setor", "==", setorLogado).get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error("Erro ao carregar produtos:", error);
                return [];
            }
        }

        const formatarPreco = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

        function renderizarCarrinho() {
            carrinhoLista.innerHTML = '';
            if (carrinho.length === 0) {
                carrinhoLista.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Carrinho vazio.</p>';
            } else {
                carrinho.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.classList.add('carrinho-item');
                    itemDiv.innerHTML = `
                        <div class="item-info">
                            <span>${item.nome}</span>
                            <span>${formatarPreco(item.preco)} x ${item.quantidade}</span>
                        </div>
                        <div class="item-actions">
                            <button class="btn-controle" data-id="${item.id}" data-acao="diminuir">-</button>
                            <span class="quantidade">${item.quantidade}</span>
                            <button class="btn-controle" data-id="${item.id}" data-acao="aumentar">+</button>
                            <button class="btn-remover-item" data-id="${item.id}">&times;</button>
                        </div>
                    `;
                    carrinhoLista.appendChild(itemDiv);
                });
            }
            atualizarResumoCarrinho();
        }
        
        function adicionarAoCarrinho(produto) {
            const itemExistente = carrinho.find(item => item.id === produto.id);
            if (itemExistente) {
                itemExistente.quantidade++;
            } else {
                carrinho.push({ ...produto, quantidade: 1 });
            }
            renderizarCarrinho();
        }

        function manipularQuantidade(id, acao) {
            const itemIndex = carrinho.findIndex(item => item.id === id);
            if (itemIndex > -1) {
                if (acao === 'aumentar') {
                    carrinho[itemIndex].quantidade++;
                } else if (acao === 'diminuir') {
                    carrinho[itemIndex].quantidade--;
                    if (carrinho[itemIndex].quantidade <= 0) {
                        carrinho.splice(itemIndex, 1);
                    }
                }
                renderizarCarrinho();
            }
        }

        function removerDoCarrinho(id) {
            carrinho = carrinho.filter(item => item.id !== id);
            renderizarCarrinho();
        }
        
        function atualizarResumoCarrinho() {
            valorTotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
            const valorRestante = valorTotal - valorPago;

            let resumoHTML = `
                <div class="carrinho-total">
                    <span>TOTAL:</span>
                    <span class="valor">${formatarPreco(valorTotal)}</span>
                </div>
            `;
            // Adicionar lógica de pagamento e troco se necessário
            
            carrinhoResumoDiv.innerHTML = resumoHTML;
        }

        carrinhoLista.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-controle')) {
                const id = event.target.dataset.id;
                const acao = event.target.dataset.acao;
                manipularQuantidade(id, acao);
            } else if (event.target.classList.contains('btn-remover-item')) {
                const id = event.target.dataset.id;
                removerDoCarrinho(id);
            }
        });

        function renderizarProdutos(produtos) {
            const acessoRapidoGrid = document.getElementById('acesso-rapido-grid');
            const outrosProdutosGrid = document.getElementById('outros-produtos-grid');
            acessoRapidoGrid.innerHTML = '';
            outrosProdutosGrid.innerHTML = '';

            produtos.forEach(produto => {
                const card = document.createElement('div');
                card.className = 'produto-card';
                card.innerHTML = `
                    <div class="nome">${produto.nome}</div>
                    <div class="preco">${formatarPreco(produto.preco)}</div>
                `;
                card.addEventListener('click', () => adicionarAoCarrinho(produto));

                if (produto.acessoRapido) {
                    acessoRapidoGrid.appendChild(card);
                } else {
                    outrosProdutosGrid.appendChild(card);
                }
            });
        }

        async function inicializarPDV() {
            produtosDoFirestore = await fetchProductsFromFirestore();
            renderizarProdutos(produtosDoFirestore);
            renderizarCarrinho();
        }

        inicializarPDV();
    }
});
