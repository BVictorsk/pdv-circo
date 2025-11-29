// minhas_transacoes.js

document.addEventListener('DOMContentLoaded', async () => {
    const userDisplay = document.getElementById('user-display');
    const transacoesGrid = document.getElementById('transacoes-grid');
    const mensagemNenhumaTransacao = document.getElementById('mensagem-nenhuma-transacao');

    const loggedInUser = sessionStorage.getItem('loggedInUser');

    if (userDisplay && loggedInUser) {
        userDisplay.textContent = loggedInUser;
    }

    if (typeof db === 'undefined' || db === null) {
        console.error("Error: Firestore 'db' object is not defined or null. Ensure firebase-config.js is loaded correctly.");
        if (mensagemNenhumaTransacao) {
            mensagemNenhumaTransacao.textContent = "Erro: Não foi possível carregar as transações. Verifique a configuração do Firebase.";
            mensagemNenhumaTransacao.style.display = "block";
        }
        return;
    }

    const formatarPreco = (valor) => `R$ ${typeof valor === 'number' ? valor.toFixed(2).replace('.', ',') : '0,00'}`;
    const formatarData = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        const date = timestamp.toDate();
        return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
    };

    async function fetchVendasFromFirestore() {
        try {
            let query = db.collection("vendas");
            if (loggedInUser) {
                query = query.where("operador", "==", loggedInUser);
            }
            const snapshot = await query.orderBy("timestamp", "desc").get();
            const vendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderVendas(vendas);
        } catch (error) {
            console.error("Erro ao carregar vendas do Firestore: ", error);
        }
    }

    window.gerarSegundaVia = async (vendaId) => {
        console.log(`Gerar 2ª via da venda com ID: ${vendaId}`);
        try {
            const vendaDoc = await db.collection("vendas").doc(vendaId).get();
            if (vendaDoc.exists) {
                const vendaData = vendaDoc.data();
                const carrinhoParaImpressao = vendaData.itens.map(item => ({
                    nome: item.nome,
                    quantidade: item.quantidade,
                    preco: item.preco
                }));

                const pagamentosParaImpressao = vendaData.pagamentos.map(pag => ({
                    tipo: pag.tipo,
                    valor: pag.valor
                }));

                if (typeof imprimirRecibo !== 'undefined') {
                    imprimirRecibo(
                        vendaId,
                        carrinhoParaImpressao,
                        vendaData.valorTotal,
                        pagamentosParaImpressao,
                        vendaData.troco || 0,
                        formatarPreco,
                        vendaData.operador
                    );
                } else {
                    console.error("Erro: Função 'imprimirRecibo' não encontrada. Certifique-se de que print.js está carregado.");
                }

            } else {
                console.error("Venda não encontrada com o ID:", vendaId);
            }
        } catch (error) {
            console.error("Erro ao buscar venda para 2ª via:", error);
        }
    };

    /**
     * Prepara os dados de uma venda para edição, armazena o ID no sessionStorage
     * e redireciona para a nova página de edição.
     * @param {string} vendaId - O ID do documento da venda no Firestore.
     */
    window.editarVenda = async (vendaId) => {
        console.log(`Iniciando edição da venda ID: ${vendaId}`);
        try {
            // Armazena apenas o ID da venda no sessionStorage. A página de edição
            // irá buscar todos os detalhes da venda usando este ID.
            sessionStorage.setItem('editVendaId', vendaId);
            
            // Redireciona para a nova página de edição de transação
            window.location.href = 'editar_transacao.html';
            
        } catch (error) {
            console.error("Erro ao preparar venda para edição:", error);
        }
    };

    window.cancelarVenda = (vendaId) => {
        console.log(`Funcionalidade de Cancelar para a venda ${vendaId} ainda não implementada.`);
    };

    function renderVendas(vendas) {
        if (!transacoesGrid) return;
        transacoesGrid.innerHTML = '';

        if (vendas.length === 0) {
            if (mensagemNenhumaTransacao) {
                mensagemNenhumaTransacao.textContent = "Nenhuma transação encontrada.";
                mensagemNenhumaTransacao.style.display = "block";
            }
            return;
        }
        
        if (mensagemNenhumaTransacao) {
            mensagemNenhumaTransacao.style.display = "none";
        }

        vendas.forEach(venda => {
            const vendaCard = document.createElement('div');
            vendaCard.classList.add('transacao-card');
            const itensHTML = venda.itens.map(item => `<li>${item.quantidade}x ${item.nome} (${formatarPreco(item.preco)})</li>`).join('');
            
            vendaCard.innerHTML = `
                <div class="card-header">
                    <h3>ID: ${venda.id.substring(0, 8)}...</h3>
                    <span class="data">${formatarData(venda.timestamp)}</span>
                </div>
                <div class="card-body">
                    <p><strong>Total:</strong> ${formatarPreco(venda.valorTotal)}</p>
                    <p><strong>Operador:</strong> ${venda.operador}</p>
                    <h4>Itens:</h4>
                    <ul>${itensHTML}</ul>
                </div>
                <div class="card-actions">
                    <button onclick="gerarSegundaVia('${venda.id}')">2ª Via</button>
                    <button onclick="editarVenda('${venda.id}')">Editar</button>
                    <button onclick="cancelarVenda('${venda.id}')">Cancelar</button>
                </div>`;
            transacoesGrid.appendChild(vendaCard);
        });
    }

    async function inicializarMinhasTransacoes() {
        await fetchVendasFromFirestore();
    }

    inicializarMinhasTransacoes();
});