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
        carregarUsuarios();
        resetFormularioUsuario();
    } else if (tabName === 'Vendas') {
        carregarVendas();
    }
}

let editingProductId = null;
let editingUserId = null;

// --- Funções de Vendas ---
async function carregarVendas() {
    const vendasContainer = document.getElementById("vendas-container");
    const mensagemNenhumaVenda = document.getElementById("mensagem-nenhuma-venda");
    if (!vendasContainer || !mensagemNenhumaVenda) return;

    vendasContainer.innerHTML = "";
    mensagemNenhumaVenda.style.display = "none";

    if (typeof db === 'undefined' || db === null) {
        console.error("Firestore 'db' is not available.");
        return;
    }

    try {
        const snapshot = await db.collection("vendas").orderBy("timestamp", "desc").get();
        if (snapshot.empty) {
            mensagemNenhumaVenda.style.display = "block";
            return;
        }

        snapshot.forEach(doc => {
            const venda = { id: doc.id, ...doc.data() };
            const card = document.createElement("div");
            card.className = "produto-card"; // Reutilizando a classe de card

            const formatarPreco = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;
            const dataVenda = venda.timestamp.toDate().toLocaleString('pt-BR');

            const itensHTML = venda.itens.map(item => 
                `<li>${item.quantidade}x ${item.nome} (${formatarPreco(item.preco)})</li>`
            ).join('');

            const pagamentosHTML = venda.pagamentos.map(pag => 
                `<li>${pag.tipo}: ${formatarPreco(pag.valor)}</li>`
            ).join('');

            card.innerHTML = `
                <div class="card-header">
                    <div class="product-title-group">
                        <div class="nome">Venda #${venda.id.substring(0, 6)}...</div>
                        <div class="product-id-display">Operador: <strong>${venda.operador}</strong></div>
                    </div>
                    <div class="card-buttons">
                       <span style="font-size: 0.8em; color: var(--text-muted);">${dataVenda}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="preco" style="margin-bottom: 10px;">Total: ${formatarPreco(venda.valorTotal)}</div>
                    <div class="setor" style="margin-bottom: 5px;"><strong>Itens:</strong></div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 0.9em;">${itensHTML}</ul>
                    <div class="setor" style="margin-top: 10px; margin-bottom: 5px;"><strong>Pagamentos:</strong></div>
                     <ul style="margin: 0; padding-left: 20px; font-size: 0.9em;">${pagamentosHTML}</ul>
                </div>`;
            vendasContainer.appendChild(card);
        });
    } catch (error) {
        console.error("Erro ao carregar vendas: ", error);
    }
}


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
        if (confirm(`Tem certeza que deseja remover o produto com ID: ${id}?`)) {
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

// --- Funções de Usuários ---
async function carregarUsuarios() {
    const usuariosGrid = document.getElementById("usuarios-grid");
    const mensagemNenhumUsuario = document.getElementById("mensagem-nenhum-usuario");
    if (!usuariosGrid || !mensagemNenhumUsuario) return;

    usuariosGrid.innerHTML = "";
    mensagemNenhumUsuario.style.display = "none";

    if (typeof db === 'undefined' || db === null) {
        console.error("Firestore 'db' is not available.");
        return;
    }

    try {
        const snapshot = await db.collection("usuarios").get();
        if (snapshot.empty) {
            mensagemNenhumUsuario.style.display = "block";
            return;
        }

        snapshot.forEach(doc => {
            const usuario = { id: doc.id, ...doc.data() };
            const card = document.createElement("div");
            card.className = "produto-card"; // Reutilizando a classe de card de produto

            card.innerHTML = `
                <div class="card-header">
                    <div class="icone">👤</div>
                    <div class="product-title-group">
                        <div class="nome">${usuario.nomeCompleto}</div>
                        <div class="product-id-display">Usuário: ${usuario.id}</div>
                    </div>
                    <div class="card-buttons">
                        <button class="btn-action btn-editar-usuario" data-id="${usuario.id}" data-nome-completo="${usuario.nomeCompleto}" data-tipo-acesso="${usuario.tipoAcesso}" title="Editar Usuário">✏️</button>
                        <button class="btn-action btn-excluir-usuario" data-id="${usuario.id}" title="Excluir Usuário">🗑️</button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="setor">Tipo de Acesso: ${usuario.tipoAcesso}</div>
                </div>`;
            usuariosGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Erro ao carregar usuários: ", error);
    }
}

async function removerUsuario(id) {
    if (typeof db === 'undefined' || db === null) return;
    try {
        if (confirm(`Tem certeza que deseja remover o usuário com ID: ${id}?`)) {
            await db.collection("usuarios").doc(id).delete();
            console.log("Usuário removido com sucesso!");
            carregarUsuarios();
        } else {
            console.log("Remoção de usuário cancelada.");
        }
    } catch (error) {
        console.error("Erro ao remover usuário: ", error);
    }
}

function editarUsuario(id, nomeCompleto, tipoAcesso) {
    resetFormularioUsuario();

    document.getElementById("usuario-id").value = id;
    document.getElementById("usuario-nome-completo").value = nomeCompleto;
    document.getElementById("usuario-tipo-acesso").value = tipoAcesso;

    editingUserId = id;
    document.getElementById("btn-salvar-usuario").textContent = "Atualizar Usuário";
    document.getElementById("usuario-id").disabled = true;

    document.getElementById("form-adicionar-usuario").scrollIntoView({ behavior: 'smooth' });
}

function resetFormularioUsuario() {
    document.getElementById("usuario-nome-completo").value = "";
    document.getElementById("usuario-id").value = "";
    document.getElementById("usuario-senha").value = "";
    document.getElementById("usuario-tipo-acesso").value = "Operador";

    editingUserId = null;
    const btnSalvarUsuario = document.getElementById("btn-salvar-usuario");
    if (btnSalvarUsuario) btnSalvarUsuario.textContent = "Salvar Usuário";

    const inputUsuarioId = document.getElementById("usuario-id");
    if (inputUsuarioId) inputUsuarioId.disabled = false;
}


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
                removerProduto(idParaRemover);
                return;
            }
        });
    }

    // Gerenciador de cliques para a lista de usuários (Event Delegation)
    const usuariosGrid = document.getElementById("usuarios-grid");
    if (usuariosGrid) {
        usuariosGrid.addEventListener('click', (e) => {
            const editButton = e.target.closest('.btn-editar-usuario');
            if (editButton) {
                const { id, nomeCompleto, tipoAcesso } = editButton.dataset;
                editarUsuario(id, nomeCompleto, tipoAcesso);
                return;
            }

            const deleteButton = e.target.closest('.btn-excluir-usuario');
            if (deleteButton) {
                const idParaRemover = deleteButton.dataset.id;
                removerUsuario(idParaRemover);
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

    // Formulário de Usuários
    const btnSalvarUsuario = document.getElementById("btn-salvar-usuario");
    const btnCancelarUsuario = document.getElementById("btn-cancelar-usuario");

    if (btnCancelarUsuario) {
        btnCancelarUsuario.addEventListener("click", resetFormularioUsuario);
    }

    if (btnSalvarUsuario) {
        btnSalvarUsuario.addEventListener("click", async () => {
            const id = document.getElementById("usuario-id").value;
            const nomeCompleto = document.getElementById("usuario-nome-completo").value;
            const senha = document.getElementById("usuario-senha").value;
            const tipoAcesso = document.getElementById("usuario-tipo-acesso").value;

            if (!id || !nomeCompleto) {
                console.error("Preencha o ID e o Nome Completo do usuário.");
                return;
            }

            // A senha só é obrigatória ao criar um novo usuário
            if (!editingUserId && !senha) {
                console.error("A senha é obrigatória para novos usuários.");
                return;
            }

            const usuarioData = {
                nomeCompleto: nomeCompleto,
                tipoAcesso: tipoAcesso,
            };

            // Adiciona a senha apenas se ela foi fornecida
            if (senha) {
                usuarioData.senha = senha;
            }

            try {
                if (editingUserId) {
                    await db.collection("usuarios").doc(editingUserId).update(usuarioData);
                    console.log("Usuário atualizado com sucesso!");
                } else {
                    await db.collection("usuarios").doc(id).set(usuarioData);
                    console.log("Usuário salvo com sucesso!");
                }
                resetFormularioUsuario();
                carregarUsuarios();
            } catch (error) {
                console.error("Erro ao salvar usuário: ", error);
            }
        });
    }
});
