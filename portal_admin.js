document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.firestore();

    // Gerenciadores de elementos DOM
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const btnAdicionarProduto = document.getElementById('btn-adicionar-produto');
    const formContainer = document.getElementById('form-adicionar-produto-container');
    const form = document.getElementById('form-adicionar-produto');
    const formTitle = document.getElementById('form-title');
    const submitButton = document.getElementById('form-submit-button');
    const cancelButton = document.getElementById('form-cancel-button');
    const formFeedback = document.getElementById('form-feedback');
    const listaProdutosDiv = document.getElementById('lista-produtos');

    let editando = false;

    // Lógica para navegação por abas
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    // Reseta e esconde o formulário
    const resetForm = () => {
        form.reset();
        editando = false;
        formTitle.textContent = 'Novo Produto';
        submitButton.textContent = 'Salvar';
        cancelButton.style.display = 'none';
        formContainer.style.display = 'none';
        document.getElementById('produto-id').disabled = false;
    };

    btnAdicionarProduto.addEventListener('click', () => {
        resetForm();
        formContainer.style.display = 'block';
    });

    cancelButton.addEventListener('click', resetForm);

    // Carregar e exibir produtos
    const carregarProdutos = async () => {
        const snapshot = await db.collection('produtos').get();
        listaProdutosDiv.innerHTML = '';
        snapshot.forEach(doc => {
            const produto = doc.data();
            const itemDiv = document.createElement('div');
            itemDiv.className = 'produto-item';
            itemDiv.innerHTML = `
                <div class="produto-info">
                    <span class="label">Nome:</span> ${produto.nome} 
                    <span class="label">ID:</span> ${produto.id} 
                    <span class="label">Rápido:</span> ${produto.rapido ? 'Sim' : 'Não'}
                </div>
                <div class="produto-acoes">
                    <button class="btn-alterar" data-id="${produto.id}">Alterar</button>
                    <button class="btn-excluir" data-id="${produto.id}">Excluir</button>
                </div>
            `;
            listaProdutosDiv.appendChild(itemDiv);
        });
    };

    // Manipulador de eventos para a lista (usando delegação de eventos)
    listaProdutosDiv.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.dataset.id;

        if (target.classList.contains('btn-excluir')) {
            if (confirm(`Tem certeza que deseja excluir o produto com ID: ${id}?`)) {
                await db.collection('produtos').doc(id).delete();
                carregarProdutos(); // Recarrega a lista
            }
        } else if (target.classList.contains('btn-alterar')) {
            const doc = await db.collection('produtos').doc(id).get();
            const produto = doc.data();
            
            editando = true;
            formTitle.textContent = 'Editando Produto';
            submitButton.textContent = 'Atualizar';
            cancelButton.style.display = 'inline-block';

            document.getElementById('produto-original-id').value = produto.id;
            document.getElementById('produto-id').value = produto.id;
            document.getElementById('produto-id').disabled = true; // Não permite alterar o ID
            document.getElementById('produto-icone').value = produto.icone;
            document.getElementById('produto-nome').value = produto.nome;
            document.getElementById('produto-preco').value = produto.preco;
            document.getElementById('produto-rapido').checked = produto.rapido;

            formContainer.style.display = 'block';
            window.scrollTo(0, 0); // Rola para o topo para ver o formulário
        }
    });

    // Submeter formulário (Adicionar ou Atualizar)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const produtoId = document.getElementById('produto-id').value;

        const produtoData = {
            icone: document.getElementById('produto-icone').value,
            id: produtoId,
            nome: document.getElementById('produto-nome').value,
            preco: parseFloat(document.getElementById('produto-preco').value),
            rapido: document.getElementById('produto-rapido').checked
        };

        await db.collection('produtos').doc(produtoId).set(produtoData, { merge: true });
        
        formFeedback.textContent = `Produto ${editando ? 'atualizado' : 'salvo'} com sucesso!`;
        formFeedback.style.color = 'green';
        
        carregarProdutos();
        setTimeout(() => {
            resetForm();
            formFeedback.textContent = '';
        }, 2000);
    });

    // Carregamento inicial
    carregarProdutos();
    carregarVendas(); // A função de carregar vendas já existe do passo anterior

    async function carregarVendas() {
        // ... (código da função carregarVendas permanece o mesmo)
    }
});
