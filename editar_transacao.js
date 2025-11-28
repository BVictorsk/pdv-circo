document.addEventListener('DOMContentLoaded', async () => {
    const userDisplay = document.getElementById('user-display');
    const transacaoDetalhesContainer = document.getElementById('transacao-detalhes');

    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const vendaId = sessionStorage.getItem('editVendaId');

    // Display logged in user
    if (userDisplay && loggedInUser) {
        userDisplay.textContent = loggedInUser;
    }

    // Check if Firestore is initialized
    if (typeof db === 'undefined' || db === null) {
        console.error("Error: Firestore 'db' object is not defined or null.");
        if (transacaoDetalhesContainer) {
            transacaoDetalhesContainer.innerHTML = '<p>Erro: A conexão com o banco de dados falhou.</p>';
        }
        return;
    }

    if (!vendaId) {
        if (transacaoDetalhesContainer) {
            transacaoDetalhesContainer.innerHTML = '<p>Nenhuma transação selecionada para edição. Volte para "Minhas Transações" e selecione uma.</p>';
        }
        return;
    }

    const formatarPreco = (valor) => `R$ ${typeof valor === 'number' ? valor.toFixed(2).replace('.', ',') : '0,00'}`;
    const formatarData = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        const date = timestamp.toDate();
        return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
    };

    try {
        const vendaDoc = await db.collection("vendas").doc(vendaId).get();

        if (vendaDoc.exists) {
            const vendaData = vendaDoc.data();
            renderDetalhesVenda(vendaData, vendaId);
        } else {
            if (transacaoDetalhesContainer) {
                transacaoDetalhesContainer.innerHTML = `<p>Erro: Transação com ID ${vendaId} não encontrada.</p>`;
            }
        }
    } catch (error) {
        console.error("Erro ao buscar detalhes da transação:", error);
        if (transacaoDetalhesContainer) {
            transacaoDetalhesContainer.innerHTML = '<p>Ocorreu um erro ao carregar os detalhes da transação.</p>';
        }
    }

    function renderDetalhesVenda(venda, id) {
        if (!transacaoDetalhesContainer) return;

        const itensHTML = venda.itens.map(item => `<li>${item.quantidade}x ${item.nome} (${formatarPreco(item.preco)})</li>`).join('');

        transacaoDetalhesContainer.innerHTML = `
            <h3>Detalhes da Venda ID: ${id}</h3>
            <div class="detalhes-venda-card">
                <p><strong>Data:</strong> ${formatarData(venda.timestamp)}</p>
                <p><strong>Operador:</strong> ${venda.operador}</p>
                <p><strong>Valor Total:</strong> ${formatarPreco(venda.valorTotal)}</p>
                <h4>Itens Vendidos:</h4>
                <ul>${itensHTML}</ul>
                <!-- Futuramente, aqui podem entrar os campos para edição -->
            </div>
        `;
    }
});