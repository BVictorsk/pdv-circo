// minhas_transacoes.js

document.addEventListener('DOMContentLoaded', async () => {
    const userDisplay = document.getElementById('user-display');
    const transacoesGrid = document.getElementById('transacoes-grid');
    const mensagemNenhumaTransacao = document.getElementById('mensagem-nenhuma-transacao');

    const loggedInUser = sessionStorage.getItem('loggedInUser');

    if (userDisplay && loggedInUser) {
        userDisplay.textContent = loggedInUser;
    }

    // Adicionado log para verificar o objeto db
    if (typeof db === 'undefined' || db === null) {
        console.error("Error: Firestore 'db' object is not defined or null. Ensure firebase-config.js is loaded correctly.");
        if (mensagemNenhumaTransacao) {
            mensagemNenhumaTransacao.textContent = "Erro: Não foi possível carregar as transações. Verifique a configuração do Firebase.";
            mensagemNenhumaTransacao.style.display = "block";
        }
        return; // Stop execution if db is not defined
    } else {
        console.log("Firestore 'db' object is defined.", db);
    }

    const formatarPreco = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;
    const formatarData = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate(); // Converte Timestamp do Firestore para objeto Date
        return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
    };

    async function fetchVendasFromFirestore() {
        try {
            let query = db.collection("vendas");

            // Log the loggedInUser to check its value
            console.log("Logged in user for transactions:", loggedInUser);

            // Filtra as transações pelo usuário logado
            if (loggedInUser) {
                query = query.where("operador", "==", loggedInUser);
                console.log(`Querying for 'vendas' where 'operador' == '${loggedInUser}'`);
            } else {
                console.log("No loggedInUser found in sessionStorage. Fetching all sales (if allowed by rules).");
            }

            // Ordena as vendas pela data mais recente (timestamp decrescente)
            const snapshot = await query.orderBy("timestamp", "desc").get();
            
            // Adicionado log para o resultado da consulta
            if (snapshot.empty) {
                console.log("Firestore query returned no documents for the logged in user.");
            } else {
                console.log("Firestore query returned documents. Count:", snapshot.size);
                console.log("Fetched sales documents:", snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Erro ao carregar vendas do Firestore: ", error);
            return [];
        }
    }

    // Funções placeholder para os botões
    window.gerarSegundaVia = (vendaId) => {
        console.log(`Gerar 2ª via da venda com ID: ${vendaId}`);
        // Implementar lógica para gerar a segunda via (ex: abrir um modal com detalhes para impressão)
    };

    window.editarVenda = (vendaId) => {
        console.log(`Editar venda com ID: ${vendaId}`);
        // Implementar lógica para edição (ex: redirecionar para uma página de edição com os dados da venda)
    };

    window.cancelarVenda = (vendaId) => {
        console.log(`Cancelar venda com ID: ${vendaId}`);
        // Implementar lógica para cancelamento (ex: exibir um modal de confirmação, atualizar status no Firestore)
    };

    function renderVendas(vendas) {
        if (!transacoesGrid) return;

        if (vendas.length === 0) {
            if (mensagemNenhumaTransacao) {
                mensagemNenhumaTransacao.textContent = "Nenhuma transação encontrada.";
                mensagemNenhumaTransacao.style.display = "block";
            }
            transacoesGrid.innerHTML = '';
            return;
        }

        if (mensagemNenhumaTransacao) {
            mensagemNenhumaTransacao.style.display = "none";
        }

        transacoesGrid.innerHTML = ''; // Limpa o grid antes de renderizar

        vendas.forEach(venda => {
            const vendaCard = document.createElement('div');
            vendaCard.classList.add('transacao-card'); // Adicione uma classe para estilização

            // Construir a lista de itens da venda
            const itensHTML = venda.itens.map(item => `
                <li>${item.quantidade}x ${item.nome} (${formatarPreco(item.preco)})</li>
            `).join('');

            // Construir a lista de pagamentos
            const pagamentosHTML = venda.pagamentos.map(pag => `
                <li>${pag.tipo.toUpperCase()}: ${formatarPreco(pag.valor)}</li>
            `).join('');

            vendaCard.innerHTML = `
                <div class="card-header">
                    <h3>Venda ID: ${venda.id}</h3>
                    <span class="data">${formatarData(venda.timestamp)}</span>
                </div>
                <div class="card-body">
                    <p><strong>Total:</strong> ${formatarPreco(venda.valorTotal)}</p>
                    <p><strong>Valor Pago:</strong> ${formatarPreco(venda.valorPago)}</p>
                    ${venda.troco > 0 ? `<p><strong>Troco:</strong> ${formatarPreco(venda.troco)}</p>` : ''}
                    <p><strong>Operador:</strong> ${venda.operador}</p>
                    
                    <h4>Itens:</h4>
                    <ul>${itensHTML}</ul>

                    <h4>Pagamentos:</h4>
                    <ul>${pagamentosHTML}</ul>
                </div>
                <div class="card-actions">
                    <button onclick="gerarSegundaVia('${venda.id}')">2ª Via</button>
                    <button onclick="editarVenda('${venda.id}')">Editar</button>
                    <button onclick="cancelarVenda('${venda.id}')">Cancelar</button>
                </div>
            `;
            transacoesGrid.appendChild(vendaCard);
        });
    }

    // Inicializar a página
    async function inicializarMinhasTransacoes() {
        const vendas = await fetchVendasFromFirestore();
        renderVendas(vendas);
    }

    inicializarMinhasTransacoes();
});