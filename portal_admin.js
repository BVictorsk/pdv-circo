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
    }
}

// Variável global para armazenar o ID do produto sendo editado
let editingProductId = null;

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

            card.innerHTML = `
                <div class="icone">${produto.icone || '❓'}</div>
                <div class="nome">${produto.nome}</div>
                <div class="preco">R$ ${precoFormatado}</div> 
                <div class="product-id-display">ID: ${produtoId}</div>
                <div class="product-actions">
                    <button class="btn-secondary btn-editar-produto" 
                            data-id="${produtoId}" 
                            data-icone="${produto.icone || ''}" 
                            data-nome="${produto.nome}" 
                            data-preco="${produto.preco}" 
                            data-acessorapido="${produto.acessoRapido}"
                            >Editar</button>
                    <button class="btn-fechar btn-excluir-produto" data-id="${produtoId}" >Remover</button>
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
                const { id, icone, nome, preco, acessorapido } = e.target.dataset;
                editarProduto(id, icone, nome, preco, acessorapido === 'true');
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
function editarProduto(id, icone, nome, preco, acessoRapido) {
    console.error("editarProduto called for ID:", id);
    const formAdicionarProduto = document.getElementById("form-adicionar-produto");
    const btnAdicionarProduto = document.getElementById("btn-adicionar-produto");
    const btnSalvarProduto = document.getElementById("btn-salvar-produto");
    const inputProdutoIcone = document.getElementById("produto-icone");
    const inputProdutoId = document.getElementById("produto-id");
    const inputProdutoNome = document.getElementById("produto-nome");
    const inputProdutoPreco = document.getElementById("produto-preco");
    const inputProdutoAcessoRapido = document.getElementById("produto-acesso-rapido");

    if (!formAdicionarProduto || !btnAdicionarProduto || !btnSalvarProduto || !inputProdutoIcone || !inputProdutoId || !inputProdutoNome || !inputProdutoPreco || !inputProdutoAcessoRapido) {
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

    // Armazena o ID do produto sendo editado e muda o texto do botão
    editingProductId = id;
    btnSalvarProduto.textContent = "Atualizar Produto";
    // Desabilita o campo de ID durante a edição
    inputProdutoId.disabled = true;

    // Mostra o formulário de edição
    toggleFormularioProduto(true);

    // Rola a página para o topo do formulário
    formAdicionarProduto.scrollIntoView({ behavior: 'smooth' });
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
    const btnAdicionarProduto = document.getElementById("btn-adicionar-produto");
    const formAdicionarProduto = document.getElementById("form-adicionar-produto");
    const btnSalvarProduto = document.getElementById("btn-salvar-produto");
    const btnCancelarProduto = document.getElementById("btn-cancelar-produto");
    const inputProdutoPreco = document.getElementById("produto-preco");

    // Debugging for element existence
    if (!btnAdicionarProduto) console.error("Error: btnAdicionarProduto not found.");
    if (!formAdicionarProduto) console.error("Error: formAdicionarProduto not found.");
    if (!btnSalvarProduto) console.error("Error: btnSalvarProduto not found.");
    if (!btnCancelarProduto) console.error("Error: btnCancelarProduto not found.");
    if (!inputProdutoPreco) console.error("Error: inputProdutoPreco not found.");

    // Novo event listener para formatar o preço ao digitar
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

    // Função para alternar a visibilidade do formulário de adição de produto
    function toggleFormularioProduto(show) {
        if (!formAdicionarProduto || !btnAdicionarProduto) {
            console.error("Error: toggleFormularioProduto failed, elements not found."); // Debugging line
            return;
        }

        if (show) {
            formAdicionarProduto.style.display = "block";
            btnAdicionarProduto.style.display = "none"; // Oculta o botão "Adicionar Produto"
        } else {
            formAdicionarProduto.style.display = "none";
            btnAdicionarProduto.style.display = "block"; // Mostra o botão "Adicionar Produto"
            limparCamposProduto();
            // Reseta o estado de edição ao ocultar o formulário
            editingProductId = null;
            btnSalvarProduto.textContent = "Salvar Produto";
            document.getElementById("produto-id").disabled = false; // Habilita o campo ID
        }
    }

    // Função para limpar os campos do formulário de produto
    function limparCamposProduto() {
        console.error("limparCamposProduto called."); // Debugging line
        const prodIcone = document.getElementById("produto-icone");
        const prodId = document.getElementById("produto-id");
        const prodNome = document.getElementById("produto-nome");
        const prodPreco = document.getElementById("produto-preco");
        const prodRapido = document.getElementById("produto-acesso-rapido");

        if (prodIcone) prodIcone.value = ""; else console.error("Error: produto-icone not found for clearing.");
        if (prodId) prodId.value = ""; else console.error("Error: produto-id not found for clearing.");
        if (prodNome) prodNome.value = ""; else console.error("Error: produto-nome not found for clearing.");
        if (prodPreco) prodPreco.value = ""; else console.error("Error: produto-preco not found for clearing.");
        if (prodRapido) prodRapido.checked = false; else console.error("Error: produto-acesso-rapido not found for clearing.");
    }

    // Event Listener para o botão "Adicionar Novo Produto"
    if (btnAdicionarProduto) {
        btnAdicionarProduto.addEventListener("click", () => {
            console.error("btnAdicionarProduto clicked."); // Debugging line
            toggleFormularioProduto(true);
        });
    }

    // Event Listener para o botão "Cancelar" no formulário de produto
    if (btnCancelarProduto) {
        btnCancelarProduto.addEventListener("click", () => {
            console.error("btnCancelarProduto clicked."); // Debugging line
            toggleFormularioProduto(false);
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

            if (!id || !nome || isNaN(preco)) {
                alert("Por favor, preencha todos os campos obrigatórios: ID, Nome e Preço (com um valor numérico válido).");
                console.error("Validation failed for saving product."); // Debugging line
                return;
            }

            try {
                if (editingProductId) {
                    // Modo de edição
                    console.error("Attempting to update product:", { icone, id: editingProductId, nome, preco, acessoRapido });
                    await db.collection("produtos").doc(editingProductId).update({
                        icone: icone,
                        nome: nome,
                        preco: preco,
                        acessoRapido: acessoRapido
                    });
                    alert("Produto atualizado com sucesso!");
                    console.error("Product updated successfully.");
                } else {
                    // Modo de adição
                    console.error("Attempting to save new product:", { icone, id, nome, preco, acessoRapido });
                    await db.collection("produtos").doc(id).set({
                        icone: icone,
                        nome: nome,
                        preco: preco,
                        acessoRapido: acessoRapido
                    });
                    alert("Produto salvo com sucesso!");
                    console.error("Product saved successfully.");
                }
                toggleFormularioProduto(false); // Oculta o formulário após salvar/atualizar
                carregarProdutos(); // Recarrega a lista de produtos
            } catch (error) {
                console.error("Erro ao salvar/atualizar produto: ", error);
                alert("Erro ao salvar/atualizar produto. Verifique o console para mais detalhes.");
            }
        });
    }
});