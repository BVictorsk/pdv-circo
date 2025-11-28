// Funções de aba
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.style.display = "block";
        evt.currentTarget.className += " active";
    }

    if (tabName === 'Produtos') {
        carregarProdutos();
        resetFormularioProduto();
    } else if (tabName === 'Usuarios') {
        // carregarUsuarios(); // Comentado pois não está totalmente implementado
        // resetFormularioUsuario(); // Comentado pois não está totalmente implementado
    }
}

let editingProductId = null;
let editingUserId = null;

// Carrega e exibe os produtos do Firestore
async function carregarProdutos() {
    const produtosGrid = document.getElementById("produtos-grid");
    const mensagemNenhumProduto = document.getElementById("mensagem-nenhum-produto");
    if (!produtosGrid || !mensagemNenhumProduto) return;

    produtosGrid.innerHTML = "";
    mensagemNenhumProduto.style.display = "none";

    if (typeof db === 'undefined' || db === null) {
        console.error("Firestore 'db' is not available.");
        return;
    }

    try {
        const snapshot = await db.collection("produtos").get();
        if (snapshot.empty) {
            mensagemNenhumProduto.style.display = "block";
            return;
        }

        let produtos = [];
        snapshot.forEach(doc => produtos.push({ id: doc.id, ...doc.data() }));
        produtos.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));

        produtos.forEach(produto => {
            const card = document.createElement("div");
            card.className = "produto-card";
            const precoFormatado = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(produto.preco);
            const acessoRapidoTag = produto.acessoRapido ? `<div class="acesso-rapido-info">⚡ Acesso Rápido</div>` : '';

            card.innerHTML = `
                <div class="card-header">
                    <div class="icone">${produto.icone || '❓'}</div>
                    <div class="product-title-group">
                        <div class="nome">${produto.nome}</div>
                        <div class="product-id-display">ID: ${produto.id}</div>
                    </div>
                    <div class="card-buttons">
                        <button class="btn-action btn-editar-produto" data-id="${produto.id}" data-icone="${produto.icone || ''}" data-nome="${produto.nome}" data-preco="${produto.preco}" data-acessorapido="${produto.acessoRapido}" data-setor="${produto.setor || ''}" title="Editar Produto">✏️</button>
                        <button class="btn-action btn-excluir-produto" data-id="${produto.id}" title="Excluir Produto">🗑️</button>
                    </div>
                </div>
                <div class="card-body">
                    ${acessoRapidoTag}
                    <div class="preco">R$ ${precoFormatado}</div>
                    <div class="setor">Setor: ${produto.setor || 'N/A'}</div>
                </div>`;
            produtosGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Erro ao carregar produtos: ", error);
    }
}

// Remove um produto do Firestore
async function removerProduto(id) {
    if (typeof db === 'undefined' || db === null) return;
    try {
        if (confirm(`Tem certeza que deseja remover o produto com ID: ${id}?`)) { // Mantido confirm para remoção, é uma ação destrutiva
            await db.collection("produtos").doc(id).delete();
            console.log("Produto removido com sucesso!");
            carregarProdutos();
        } else {
            console.log("Remoção de produto cancelada.");
        }
    } catch (error) {
        console.error("Erro ao remover produto: ", error);
    }
}

// Preenche o formulário de produto para edição
function editarProduto(id, icone, nome, preco, acessoRapido, setor) {
    resetFormularioProduto();
    
    document.getElementById("produto-icone").value = icone;
    document.getElementById("produto-id").value = id;
    document.getElementById("produto-nome").value = nome;
    document.getElementById("produto-preco").value = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(preco));
    document.getElementById("produto-acesso-rapido").checked = acessoRapido;
    document.getElementById("produto-setor").value = setor;

    editingProductId = id;
    document.getElementById("btn-salvar-produto").textContent = "Atualizar Produto";
    document.getElementById("produto-id").disabled = false; 

    document.getElementById("form-adicionar-produto").scrollIntoView({ behavior: 'smooth' });
}


// Reseta o formulário de produto
function resetFormularioProduto() {
    document.getElementById("produto-icone").value = "";
    document.getElementById("produto-id").value = "";
    document.getElementById("produto-nome").value = "";
    document.getElementById("produto-preco").value = "";
    document.getElementById("produto-acesso-rapido").checked = false;
    document.getElementById("produto-setor").value = "A&B";
    
    editingProductId = null;
    const btnSalvarProduto = document.getElementById("btn-salvar-produto");
    if (btnSalvarProduto) btnSalvarProduto.textContent = "Salvar Produto";
    
    const inputProdutoId = document.getElementById("produto-id");
    if (inputProdutoId) inputProdutoId.disabled = false;
}

// --- Funções de Usuários (simplificadas) ---
function carregarUsuarios() { console.log("Carregar usuários não implementado nesta versão."); }
function resetFormularioUsuario() { console.log("Reset formulário de usuário não implementado."); }


// --- Event Listeners Principais ---
document.addEventListener("DOMContentLoaded", () => {
    const defaultOpenButton = document.getElementById("defaultOpen");
    if (defaultOpenButton) defaultOpenButton.click();

    // Gerenciador de cliques para a lista de produtos (Event Delegation)
    const produtosGrid = document.getElementById("produtos-grid");
    if (produtosGrid) {
        produtosGrid.addEventListener('click', (e) => {
            const editButton = e.target.closest('.btn-editar-produto');
            if (editButton) {
                const { id, icone, nome, preco, acessorapido, setor } = editButton.dataset;
                editarProduto(id, icone, nome, preco, acessorapido === 'true', setor);
                return;
            }

            const deleteButton = e.target.closest('.btn-excluir-produto');
            if (deleteButton) {
                const idParaRemover = deleteButton.dataset.id;
                removerProduto(idParaRemover); // removerProduto agora tem o confirm
                return;
            }
        });
    }

    // Formulário de Produtos
    const btnSalvarProduto = document.getElementById("btn-salvar-produto");
    const btnCancelarProduto = document.getElementById("btn-cancelar-produto");

    if (btnCancelarProduto) {
        btnCancelarProduto.addEventListener("click", resetFormularioProduto);
    }

    if (btnSalvarProduto) {
        btnSalvarProduto.addEventListener("click", async () => {
            const newId = document.getElementById("produto-id").value;
            const nome = document.getElementById("produto-nome").value;
            const precoInput = document.getElementById("produto-preco").value;
            if (!newId || !nome || !precoInput) {
                console.error("Preencha ID, Nome e Preço.");
                return;
            }

            const produtoData = {
                icone: document.getElementById("produto-icone").value,
                nome: nome,
                preco: parseFloat(precoInput.replace(/\./g, '').replace(',', '.')),
                acessoRapido: document.getElementById("produto-acesso-rapido").checked,
                setor: document.getElementById("produto-setor").value
            };

            try {
                if (editingProductId) {
                    if (editingProductId !== newId) {
                        await db.collection("produtos").doc(newId).set(produtoData);
                        await db.collection("produtos").doc(editingProductId).delete();
                        console.log("Produto atualizado com novo ID!");
                    } else {
                        await db.collection("produtos").doc(newId).update(produtoData);
                        console.log("Produto atualizado!");
                    }
                } else {
                    await db.collection("produtos").doc(newId).set(produtoData);
                    console.log("Produto salvo!");
                }
                resetFormularioProduto();
                carregarProdutos();
            } catch (error) {
                console.error("Erro ao salvar produto: ", error);
            }
        });
    }
});