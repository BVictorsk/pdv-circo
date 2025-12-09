// --- Lógica do PDV (pdv.js) ---

document.addEventListener('DOMContentLoaded', () => {
    // ---- CONTROLE DE SESSÃO E LOGOUT ----
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const setorLogado = sessionStorage.getItem('setorLogado');

    // Se não houver usuário ou setor logado, redireciona para a tela de login
    if (!loggedInUser || !setorLogado) {
        window.location.href = 'index.html';
        return; // Interrompe a execução do script para evitar erros
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.clear(); // Limpa toda a sessão
            window.location.href = 'index.html'; // Redireciona para o login
        });
    }

    // ---- INICIALIZAÇÃO DA INTERFACE DO PDV ----
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.textContent = `${loggedInUser} (${setorLogado})`;
    }

    const adminPanelLink = document.getElementById('admin-panel-link');
    const loggedInUserAccessType = sessionStorage.getItem('loggedInUserAccessType');
    if (adminPanelLink && loggedInUserAccessType === 'Operador') {
        adminPanelLink.style.display = 'none';
    }

    // ---- LÓGICA PRINCIPAL DO PDV ----
    const SENHA_SUPERVISOR = '5678'; 
    let carrinho = [];
    let valorTotal = 0;
    let valorPago = 0;
    let valorRestante = 0;
    let trocoNecessario = 0;
    let pagamentosEfetuados = [];
    let produtosDoFirestore = [];
    let justificativaBrinde = '';

    const carrinhoLista = document.getElementById('carrinho-lista');
    const carrinhoResumoDiv = document.querySelector('.pdv-carrinho .carrinho-resumo');
    const brindeContainer = document.getElementById('brinde-container');
    
    // Função para buscar produtos do Firestore filtrando por setor
    async function fetchProductsFromFirestore() {
        if (typeof db === 'undefined' || db === null) {
            console.error("Erro: Firestore não conectado.");
            return [];
        }
        try {
            const snapshot = await db.collection("produtos").where("setor", "==", setorLogado).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Erro ao carregar produtos do Firestore: ", error);
            return [];
        }
    }

    // Restante da sua lógica do PDV (renderizarProdutos, adicionarAoCarrinho, finalizarVenda, etc.).
    // As funções devem ser incluídas aqui para que o PDV funcione.

    // Exemplo de como a inicialização deve ocorrer:
    async function inicializarPDV() {
        produtosDoFirestore = await fetchProductsFromFirestore();
        // renderizarProdutos(produtosDoFirestore);
        // renderizarCarrinho();
        // ... e assim por diante
    }

    // Inicia o PDV
    inicializarPDV();
});
