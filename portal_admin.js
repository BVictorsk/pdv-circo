// Funções de aba (mantidas como estão)
function openTab(evt, tabName) {
    console.error("openTab called for:", tabName); // Debugging line
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
        console.error("Tab", tabName, "displayed."); // Debugging line
    } else {
        console.error("Error: Tab content for", tabName, "not found."); // Debugging line
    }

    // Se a aba de Produtos for aberta, carrega a lista de produtos
    if (tabName === 'Produtos') {
        console.error("Calling carregarProdutos from openTab."); // Debugging line
        carregarProdutos();
        resetFormularioProduto(); // Ensure product form is reset when switching to this tab
    } else if (tabName === 'Usuarios') {
        console.error("Calling carregarUsuarios from openTab."); // Debugging line
        carregarUsuarios();
        resetFormularioUsuario(); // Ensure user form is reset when switching to this tab
    }
}

// Variável global para armazenar o ID do produto sendo editado
let editingProductId = null;
// Variável global para armazenar o ID do usuário sendo editado
let editingUserId = null;

// Função para carregar e exibir os produtos do Firestore
async function carregarProdutos() {
    console.error("carregarProdutos called."); // Debugging line
    const produtosGrid = document.getElementById("produtos-grid");
    const mensagemNenhumProduto = document.getElementById("mensagem-nenhum-produto");

    if (!produtosGrid || !mensagemNenhumProduto) {
        console.error("Error: produtosGrid or mensagemNenhumProduto not found in carregarProdutos."); // Debugging line
        return;
    }

    produtosGrid.innerHTML = ""; // Limpa a lista antes de carregar
    mensagemNenhumProduto.style.display = "none"; // Oculta a mensagem de "nenhum produto" inicialmente

    if (typeof db === 'undefined' || db === null) {
        console.error("Error: Firestore 'db' object is not defined or null in carregarProdutos. Check firebase-config.js and script loading order.");
        return;
    }
    console.log("Firestore 'db' object is accessible.", db);

    try {
        console.error("Attempting to fetch products from Firestore 'produtos' collection.");
        const snapshot = await db.collection("produtos").get();
        console.error("Products snapshot received. Is empty:", snapshot.empty);

        if (snapshot.empty) {
            mensagemNenhumProduto.style.display = "block";
            console.error("No products found, displaying message.");
            return;
        }

        snapshot.forEach(doc => {
            const produto = doc.data();
            const produtoId = doc.id;
            const card = document.createElement("div");
            card.className = "produto-card";
            // Convertendo o preço para o formato BR para exibição no card
            const precoFormatado = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(produto.preco);

            // Adiciona o ícone de relâmpago e texto se for acesso rápido
            const acessoRapidoTag = produto.acessoRapido ? '<div class="acesso-rapido-info">⚡ Acesso Rápido</div>' : '';

            card.innerHTML = `
                <div class="card-header">
                    <div class="icone">${produto.icone || '❓'}</div>
                    <div class="product-title-group">
                        <div class="nome">${produto.nome}</div>
                        <div class="product-id-display">ID: ${produtoId}</div>
                    </div>
                    <div class="card-buttons">
                        <button class="btn-action btn-editar-produto"
                                data-id="${produtoId}"
                                data-icone="${produto.icone || ''}"
                                data-nome="${produto.nome}"
                                data-preco="${produto.preco}"
                                data-acessorapido="${produto.acessoRapido}"
                                data-setor="${produto.setor || ''}"
                                title="Editar Produto">✏️</button>
                        <button class="btn-action btn-excluir-produto" data-id="${produtoId}" title="Excluir Produto">🗑️</button>
                    </div>
                </div>
                <div class="card-body">
                    ${acessoRapidoTag}
                    <div class="preco">R$ ${precoFormatado}</div>
                    <div class="setor">Setor: ${produto.setor || 'N/A'}</div>
                </div>
            `;
            if (produtosGrid) {
                produtosGrid.appendChild(card);
            }
        });
        console.error("Products rendered.");

        // Adicionar event listeners para os botões de remover
        document.querySelectorAll(".btn-excluir-produto").forEach(button => {
            button.addEventListener("click", (e) => {
                const idParaRemover = e.target.dataset.id;
                if (confirm(`Tem certeza que deseja remover o produto com ID: ${idParaRemover}?`)) {
                    removerProduto(idParaRemover);
                }
            });
        });

        // Adicionar event listeners para os botões de editar
        document.querySelectorAll(".btn-editar-produto").forEach(button => {
            button.addEventListener("click", (e) => {
                const { id, icone, nome, preco, acessorapido, setor } = e.target.dataset;
                editarProduto(id, icone, nome, preco, acessorapido === 'true', setor);
            });
        });

    } catch (error) {
        console.error("Erro ao carregar produtos: ", error);
    }
}

// Função para remover um produto
async function removerProduto(id) {
    console.error("removerProduto called for ID:", id);
    if (typeof db === 'undefined' || db === null) {
        console.error("Error: Firestore 'db' object is not defined or null in removerProduto.");
        return;
    }
    try {
        await db.collection("produtos").doc(id).delete();
        alert("Produto removido com sucesso!");
        console.error("Product removed successfully.");
        carregarProdutos(); // Recarrega a lista
    } catch (error) {
        console.error("Erro ao remover produto: ", error);
        alert("Erro ao remover produto. Verifique o console para mais detalhes.");
    }
}

// Função para editar um produto
function editarProduto(id, icone, nome, preco, acessoRapido, setor) {
    console.error("editarProduto called for ID:", id);
    // Clear the form first to ensure a clean state before populating
    resetFormularioProduto(); 

    const btnSalvarProduto = document.getElementById("btn-salvar-produto");
    const inputProdutoIcone = document.getElementById("produto-icone");
    const inputProdutoId = document.getElementById("produto-id");
    const inputProdutoNome = document.getElementById("produto-nome");
    const inputProdutoPreco = document.getElementById("produto-preco");
    const inputProdutoAcessoRapido = document.getElementById("produto-acesso-rapido");
    const selectProdutoSetor = document.getElementById("produto-setor");


    if (!btnSalvarProduto || !inputProdutoIcone || !inputProdutoId || !inputProdutoNome || !inputProdutoPreco || !inputProdutoAcessoRapido || !selectProdutoSetor) {
        console.error("Error: One or more required elements for editing product not found.");
        return;
    }

    // Preenche o formulário com os dados do produto
    inputProdutoIcone.value = icone;
    inputProdutoId.value = id;
    inputProdutoNome.value = nome;
    // Formata o preço para exibição no campo de texto
    // Removendo o .replace para evitar problemas com valores que já vêm formatados,
    // e utilizando parseFloat para garantir que a formatação Intl.NumberFormat funcione corretamente.
    inputProdutoPreco.value = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(preco));
    inputProdutoAcessoRapido.checked = acessoRapido;
    selectProdutoSetor.value = setor;

    // Armazena o ID do produto sendo editado e muda o texto do botão
    editingProductId = id;
    btnSalvarProduto.textContent = "Atualizar Produto";
    // Desabilita o campo de ID durante a edição
    inputProdutoId.disabled = true;

    // Rola a página para o topo do formulário
    const formAdicionarProduto = document.getElementById("form-adicionar-produto");
    if (formAdicionarProduto) {
        formAdicionarProduto.scrollIntoView({ behavior: 'smooth' });
    }
}

// Função para resetar/limpar os campos do formulário de produto e estado de edição
function resetFormularioProduto() {
    console.error("resetFormularioProduto called."); // Debugging line
    const prodIcone = document.getElementById("produto-icone");
    const prodId = document.getElementById("produto-id");
    const prodNome = document.getElementById("produto-nome");
    const prodPreco = document.getElementById("produto-preco");
    const prodRapido = document.getElementById("produto-acesso-rapido");
    const prodSetor = document.getElementById("produto-setor");
    const btnSalvarProduto = document.getElementById("btn-salvar-produto");

    if (prodIcone) prodIcone.value = ""; else console.error("Error: produto-icone not found for clearing.");
    if (prodId) prodId.value = ""; else console.error("Error: produto-id not found for clearing.");
    if (prodNome) prodNome.value = ""; else console.error("Error: produto-nome not found for clearing.");
    if (prodPreco) prodPreco.value = ""; else console.error("Error: produto-preco not found for clearing.");
    if (prodRapido) prodRapido.checked = false; else console.error("Error: produto-acesso-rapido not found for clearing.");
    if (prodSetor) prodSetor.value = "A&B"; // Define um valor padrão

    // Reseta o estado de edição
    editingProductId = null;
    if (btnSalvarProduto) {
        btnSalvarProduto.textContent = "Salvar Produto";
    }
    if (prodId) {
        prodId.disabled = false; // Habilita o campo ID
    }
}

// --- Funções para Gerenciamento de Usuários (NOVO) ---

// Função para carregar e exibir os usuários do Firestore
async function carregarUsuarios() {
    console.error("carregarUsuarios called."); // Debugging line
    const usuariosGrid = document.getElementById("usuarios-grid");
    const mensagemNenhumUsuario = document.getElementById("mensagem-nenhum-usuario");

    if (!usuariosGrid || !mensagemNenhumUsuario) {
        console.error("Error: usuariosGrid or mensagemNenhumUsuario not found in carregarUsuarios.");
        return;
    }

    usuariosGrid.innerHTML = ""; // Limpa a lista antes de carregar
    mensagemNenhumUsuario.style.display = "none"; // Oculta a mensagem de "nenhum usuário" inicialmente

    if (typeof db === 'undefined' || db === null) {
        console.error("Error: Firestore 'db' object is not defined or null in carregarUsuarios. Check firebase-config.js and script loading order.");
        return;
    }

    try {
        console.error("Attempting to fetch users from Firestore 'usuarios' collection.");
        const snapshot = await db.collection("usuarios").get();
        console.error("Users snapshot received. Is empty:", snapshot.empty);

        if (snapshot.empty) {
            mensagemNenhumUsuario.style.display = "block";
            console.error("No users found, displaying message.");
            return;
        }

        snapshot.forEach(doc => {
            const usuario = doc.data();
            const usuarioId = doc.id;
            const card = document.createElement("div");
            card.className = "produto-card"; // Reutilizando o estilo do card de produto

            card.innerHTML = `
                <div class="card-header">
                    <div class="icone">👤</div>
                    <div class="product-title-group">
                        <div class="nome">${usuario.nomeCompleto}</div>
                        <div class="product-id-display">ID: ${usuarioId}</div>
                    </div>
                    <div class="card-buttons">
                        <button class="btn-action btn-editar-usuario"
                                data-id="${usuarioId}"
                                data-nomecompleto="${usuario.nomeCompleto}"
                                data-tipodeacesso="${usuario.tipoAcesso}"
                                title="Editar Usuário">✏️</button>
                        <button class="btn-action btn-excluir-usuario" data-id="${usuarioId}" title="Excluir Usuário">🗑️</button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="setor">Acesso: ${usuario.tipoAcesso || 'N/A'}</div>
                </div>
            `;
            if (usuariosGrid) {
                usuariosGrid.appendChild(card);
            }
        });
        console.error("Users rendered.");

        // Adicionar event listeners para os botões de remover usuário
        document.querySelectorAll(".btn-excluir-usuario").forEach(button => {
            button.addEventListener("click", (e) => {
                const idParaRemover = e.target.dataset.id;
                if (confirm(`Tem certeza que deseja remover o usuário com ID: ${idParaRemover}?`)) {
                    removerUsuario(idParaRemover);
                }
            });
        });

        // Adicionar event listeners para os botões de editar usuário
        document.querySelectorAll(".btn-editar-usuario").forEach(button => {
            button.addEventListener("click", (e) => {
                const { id, nomecompleto, tipodeacesso } = e.target.dataset;
                editarUsuario(id, nomecompleto, tipodeacesso);
            });
        });

    } catch (error) {
        console.error("Erro ao carregar usuários: ", error);
    }
}

// Função para remover um usuário
async function removerUsuario(id) {
    console.error("removerUsuario called for ID:", id);
    if (typeof db === 'undefined' || db === null) {
        console.error("Error: Firestore 'db' object is not defined or null in removerUsuario.");
        return;
    }
    try {
        await db.collection("usuarios").doc(id).delete();
        alert("Usuário removido com sucesso!");
        console.error("User removed successfully.");
        carregarUsuarios(); // Recarrega a lista
    } catch (error) {
        console.error("Erro ao remover usuário: ", error);
        alert("Erro ao remover usuário. Verifique o console para mais detalhes.");
    }
}

// Função para editar um usuário
function editarUsuario(id, nomeCompleto, tipoAcesso) {
    console.error("editarUsuario called for ID:", id);
    resetFormularioUsuario(); // Clear the form first

    const inputUsuarioNomeCompleto = document.getElementById("usuario-nome-completo");
    const inputUsuarioId = document.getElementById("usuario-id");
    const inputUsuarioSenha = document.getElementById("usuario-senha");
    const selectUsuarioTipoAcesso = document.getElementById("usuario-tipo-acesso");
    const btnSalvarUsuario = document.getElementById("btn-salvar-usuario");

    if (!inputUsuarioNomeCompleto || !inputUsuarioId || !inputUsuarioSenha || !selectUsuarioTipoAcesso || !btnSalvarUsuario) {
        console.error("Error: One or more required elements for editing user not found.");
        return;
    }

    // Preenche o formulário com os dados do usuário
    inputUsuarioNomeCompleto.value = nomeCompleto;
    inputUsuarioId.value = id;
    inputUsuarioSenha.value = ''; // Senha não é preenchida por segurança
    selectUsuarioTipoAcesso.value = tipoAcesso;

    // Armazena o ID do usuário sendo editado e muda o texto do botão
    editingUserId = id;
    btnSalvarUsuario.textContent = "Atualizar Usuário";
    // Desabilita o campo de ID durante a edição
    inputUsuarioId.disabled = true;

    // Rola a página para o topo do formulário
    const formAdicionarUsuario = document.getElementById("form-adicionar-usuario");
    if (formAdicionarUsuario) {
        formAdicionarUsuario.scrollIntoView({ behavior: 'smooth' });
    }
}

// Função para resetar/limpar os campos do formulário de usuário e estado de edição
function resetFormularioUsuario() {
    console.error("resetFormularioUsuario called."); // Debugging line
    const inputUsuarioNomeCompleto = document.getElementById("usuario-nome-completo");
    const inputUsuarioId = document.getElementById("usuario-id");
    const inputUsuarioSenha = document.getElementById("usuario-senha");
    const selectUsuarioTipoAcesso = document.getElementById("usuario-tipo-acesso");
    const btnSalvarUsuario = document.getElementById("btn-salvar-usuario");
    const btnCancelarUsuario = document.getElementById("btn-cancelar-usuario");

    if (inputUsuarioNomeCompleto) inputUsuarioNomeCompleto.value = "";
    if (inputUsuarioId) inputUsuarioId.value = "";
    if (inputUsuarioSenha) inputUsuarioSenha.value = "";
    if (selectUsuarioTipoAcesso) selectUsuarioTipoAcesso.value = "Operador"; // Define um valor padrão

    // Reseta o estado de edição
    editingUserId = null;
    if (btnSalvarUsuario) {
        btnSalvarUsuario.textContent = "Salvar Usuário";
    }
    if (inputUsuarioId) {
        inputUsuarioId.disabled = false; // Habilita o campo ID
    }
     if (btnCancelarUsuario) {
        btnCancelarUsuario.textContent = "Limpar Formulário de Usuário";
    }
}

// Abrir a aba padrão ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    console.error("DOMContentLoaded event fired."); // Debugging line

    const defaultOpenButton = document.getElementById("defaultOpen");
    if (defaultOpenButton) {
        defaultOpenButton.click();
        console.error("defaultOpen button clicked."); // Debugging line
    } else {
        console.error("Error: defaultOpen button not found. Page might be blank."); // Debugging line
    }

    // Lógica específica para a aba de Produtos
    const formAdicionarProduto = document.getElementById("form-adicionar-produto");
    const btnSalvarProduto = document.getElementById("btn-salvar-produto");
    const btnCancelarProduto = document.getElementById("btn-cancelar-produto");
    const inputProdutoPreco = document.getElementById("produto-preco");

    if (!formAdicionarProduto) console.error("Error: formAdicionarProduto not found.");
    if (!btnSalvarProduto) console.error("Error: btnSalvarProduto not found.");
    if (!btnCancelarProduto) console.error("Error: btnCancelarProduto not found.");
    if (!inputProdutoPreco) console.error("Error: inputProdutoPreco not found.");

    // Initialize product form to a clean state on load
    resetFormularioProduto();

    // Novo event listener para formatar o preço ao digitar (Produtos)
    if (inputProdutoPreco) {
        inputProdutoPreco.addEventListener('input', formatarPrecoAoDigitar);
    }

    function formatarPrecoAoDigitar(event) {
        let input = event.target;
        let val = input.value.replace(/\D/g, ""); // só números

        if (!val) {
            input.value = "";
            return;
        }

        // Garante pelo menos dois dígitos para os centavos
        while (val.length < 3) {
            val = "0" + val;
        }

        let inteiro = val.slice(0, -2);
        let decimal = val.slice(-2);

        // REMOVE zeros à esquerda do inteiro
        inteiro = inteiro.replace(/^0+(?=\d)/, "");

        input.value = inteiro + "," + decimal;
    }

    // Event Listener para o botão "Limpar Formulário" (Produtos)
    if (btnCancelarProduto) {
        btnCancelarProduto.addEventListener("click", () => {
            console.error("btnCancelarProduto clicked, resetting product form."); // Debugging line
            resetFormularioProduto();
        });
    }

    // Event Listener para o botão "Salvar Produto" (Modificado para lidar com edição)
    if (btnSalvarProduto) {
        btnSalvarProduto.addEventListener("click", async () => {
            console.error("btnSalvarProduto clicked."); // Debugging line
            const icone = document.getElementById("produto-icone").value;
            const id = document.getElementById("produto-id").value;
            const nome = document.getElementById("produto-nome").value;
            const precoInput = document.getElementById("produto-preco").value;
            // Remove pontos de milhar e substitui vírgula decimal por ponto para parseFloat
            const preco = parseFloat(precoInput.replace(/\./g, '').replace(',', '.'));
            const acessoRapido = document.getElementById("produto-acesso-rapido").checked;
            const setor = document.getElementById("produto-setor").value;


            if (!id || !nome || isNaN(preco)) {
                alert("Por favor, preencha todos os campos obrigatórios: ID, Nome e Preço (com um valor numérico válido).");
                console.error("Validation failed for saving product."); // Debugging line
                return;
            }

            try {
                if (editingProductId) {
                    // Modo de edição
                    console.error("Attempting to update product:", { icone, id: editingProductId, nome, preco, acessoRapido, setor });
                    await db.collection("produtos").doc(editingProductId).update({
                        icone: icone,
                        nome: nome,
                        preco: preco,
                        acessoRapido: acessoRapido,
                        setor: setor
                    });
                    alert("Produto atualizado com sucesso!");
                    console.error("Product updated successfully.");
                } else {
                    // Modo de adição
                    console.error("Attempting to save new product:", { icone, id, nome, preco, acessoRapido, setor });
                    await db.collection("produtos").doc(id).set({
                        icone: icone,
                        nome: nome,
                        preco: preco,
                        acessoRapido: acessoRapido,
                        setor: setor
                    });
                    alert("Produto salvo com sucesso!");
                    console.error("Product saved successfully.");
                }
                resetFormularioProduto(); // Reset the form after saving/updating
                carregarProdutos(); // Recarrega a lista de produtos
            } catch (error) {
                console.error("Erro ao salvar/atualizar produto: ", error);
                alert("Erro ao salvar/atualizar produto. Verifique o console para mais detalhes.");
            }
        });
    }

    // --- Lógica específica para a aba de Usuários (NOVO) ---
    const formAdicionarUsuario = document.getElementById("form-adicionar-usuario");
    const btnSalvarUsuario = document.getElementById("btn-salvar-usuario");
    const btnCancelarUsuarioForm = document.getElementById("btn-cancelar-usuario"); // Renamed to avoid conflict
    const inputUsuarioNomeCompleto = document.getElementById("usuario-nome-completo");
    const inputUsuarioId = document.getElementById("usuario-id");
    const inputUsuarioSenha = document.getElementById("usuario-senha");
    const selectUsuarioTipoAcesso = document.getElementById("usuario-tipo-acesso");

    // Debugging for element existence
    if (!formAdicionarUsuario) console.error("Error: formAdicionarUsuario not found.");
    if (!btnSalvarUsuario) console.error("Error: btnSalvarUsuario not found.");
    if (!btnCancelarUsuarioForm) console.error("Error: btnCancelarUsuarioForm not found.");
    if (!inputUsuarioNomeCompleto) console.error("Error: inputUsuarioNomeCompleto not found.");
    if (!inputUsuarioId) console.error("Error: inputUsuarioId not found.");
    if (!inputUsuarioSenha) console.error("Error: inputUsuarioSenha not found.");
    if (!selectUsuarioTipoAcesso) console.error("Error: selectUsuarioTipoAcesso not found.");

    // Initialize user form to a clean state on load
    resetFormularioUsuario();

    // Event Listener para o botão "Limpar Formulário de Usuário"
    if (btnCancelarUsuarioForm) {
        btnCancelarUsuarioForm.addEventListener("click", () => {
            console.error("btnCancelarUsuarioForm clicked, resetting user form.");
            resetFormularioUsuario();
        });
    }

    // Event Listener para o botão "Salvar Usuário"
    if (btnSalvarUsuario) {
        btnSalvarUsuario.addEventListener("click", async () => {
            console.error("btnSalvarUsuario clicked.");
            const nomeCompleto = inputUsuarioNomeCompleto.value;
            const id = inputUsuarioId.value;
            const senha = inputUsuarioSenha.value;
            const tipoAcesso = selectUsuarioTipoAcesso.value;

            if (!nomeCompleto || !id || !senha || !tipoAcesso) {
                alert("Por favor, preencha todos os campos obrigatórios para o usuário.");
                console.error("Validation failed for saving user.");
                return;
            }

            try {
                if (editingUserId) {
                    // Modo de edição
                    console.error("Attempting to update user:", { id: editingUserId, nomeCompleto, tipoAcesso });
                    await db.collection("usuarios").doc(editingUserId).update({
                        nomeCompleto: nomeCompleto,
                        // Senha não é atualizada aqui por segurança. Deve ser uma operação separada se necessário.
                        tipoAcesso: tipoAcesso
                    });
                    alert("Usuário atualizado com sucesso!");
                    console.error("User updated successfully.");
                } else {
                    // Modo de adição
                    console.error("Attempting to save new user:", { id, nomeCompleto, senha, tipoAcesso });
                    await db.collection("usuarios").doc(id).set({
                        nomeCompleto: nomeCompleto,
                        senha: senha, // Em um ambiente real, a senha deve ser hasheada
                        tipoAcesso: tipoAcesso
                    });
                    alert("Usuário salvo com sucesso!");
                    console.error("User saved successfully.");
                }
                resetFormularioUsuario(); // Reset the form after saving/updating
                carregarUsuarios(); // Recarrega a lista de usuários
            } catch (error) {
                console.error("Erro ao salvar/atualizar usuário: ", error);
                alert("Erro ao salvar/atualizar usuário. Verifique o console para mais detalhes.");
            }
        });
    }
});