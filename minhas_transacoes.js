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

    if (!loggedInUser) {
        if (mensagemNenhumaTransacao) {
            mensagemNenhumaTransacao.textContent = "Nenhum usuário logado. Por favor, faça login para ver suas transações.";
            mensagemNenhumaTransacao.style.display = "block";
        }
        return;
    }

    // Função para formatar o preço para exibição
    const formatarPreco = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

    try {
        // Busca todas as vendas no Firestore
        const vendasSnapshot = await db.collection("vendas").where("operador", "==", loggedInUser).orderBy("timestamp", "desc").get();

        if (vendasSnapshot.empty) {
            if (mensagemNenhumaTransacao) {
                mensagemNenhumaTransacao.style.display = "block";
            }
            return;
        }

        if (mensagemNenhumaTransacao) {
            mensagemNenhumaTransacao.style.display = "none"; // Oculta a mensagem se houver transações
        }

        vendasSnapshot.forEach(doc => {
            const venda = doc.data();
            const vendaId = doc.id;
            const card = document.createElement("div");
            card.className = "produto-card"; // Reutilizando o estilo do card de produto para as vendas

            const dataVenda = venda.timestamp ? new Date(venda.timestamp.toDate()).toLocaleString('pt-BR') : 'N/A';

            let itensHTML = '';
            if (venda.itens && venda.itens.length > 0) {
                itensHTML = '<ul class="venda-itens-lista">' + 
                            venda.itens.map(item => `<li>${item.quantidade}x ${item.nome} (${formatarPreco(item.preco)})</li>`).join('') +
                            '</ul>';
            }

            let pagamentosHTML = '';
            if (venda.pagamentos && venda.pagamentos.length > 0) {
                pagamentosHTML = '<ul class="venda-pagamentos-lista">' + 
                                 venda.pagamentos.map(pag => `<li>${pag.tipo}: ${formatarPreco(pag.valor)}</li>`).join('') +
                                 '</ul>';
            }

            card.innerHTML = `
                <div class="card-header">
                    <div class="icone">🛍️</div>
                    <div class="product-title-group">
                        <div class="nome">Venda #${vendaId}</div>
                        <div class="product-id-display">Operador: ${venda.operador || 'N/A'}</div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="venda-info"><strong>Data:</strong> ${dataVenda}</div>
                    <div class="venda-info"><strong>Total:</strong> ${formatarPreco(venda.valorTotal || 0)}</div>
                    ${itensHTML ? `<div class="venda-info"><strong>Itens:</strong>${itensHTML}</div>` : ''}
                    ${pagamentosHTML ? `<div class="venda-info"><strong>Pagamentos:</strong>${pagamentosHTML}</div>` : ''}
                    ${venda.troco > 0 ? `<div class="venda-info" style="color: var(--green-success);"><strong>Troco:</strong> ${formatarPreco(venda.troco)}</div>` : ''}
                    <div class="venda-info"><strong>Status:</strong> ${venda.tipo || 'N/A'}</div>
                </div>
            `;
            if (transacoesGrid) {
                transacoesGrid.appendChild(card);
            }
        });

    } catch (error) {
        console.error("Erro ao carregar transações: ", error);
        if (mensagemNenhumaTransacao) {
            mensagemNenhumaTransacao.textContent = "Erro ao carregar suas transações. Tente novamente mais tarde.";
            mensagemNenhumaTransacao.style.display = "block";
        }
    }
});