// minhas_transacoes.js

document.addEventListener('DOMContentLoaded', async () => {
    const userDisplay = document.getElementById('user-display');
    const transacoesGrid = document.getElementById('transacoes-grid');
    const mensagemNenhumaTransacao = document.getElementById('mensagem-nenhuma-transacao');

    const loggedInUser = sessionStorage.getItem('loggedInUser');

    let currentEditingSale = null; // Variável para armazenar a venda atualmente em edição
    let allProducts = []; // Para armazenar o catálogo de produtos

    if (userDisplay && loggedInUser) {
        userDisplay.textContent = loggedInUser;
    }

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
        const date = timestamp.toDate();
        return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
    };

    // Função para buscar o catálogo de produtos do Firestore
    async function fetchProducts() {
        try {
            const snapshot = await db.collection("produtos").get();
            allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Catálogo de produtos carregado:", allProducts);
        } catch (error) {
            console.error("Erro ao carregar catálogo de produtos:", error);
            allProducts = [];
        }
    }

    async function fetchVendasFromFirestore() {
        try {
            let query = db.collection("vendas");
            console.log("Logged in user for transactions:", loggedInUser);

            if (loggedInUser) {
                query = query.where("operador", "==", loggedInUser);
                console.log(`Querying for 'vendas' where 'operador' == '${loggedInUser}'`);
            } else {
                console.log("No loggedInUser found in sessionStorage. Fetching all sales (if allowed by rules).");
            }

            const snapshot = await query.orderBy("timestamp", "desc").get();
            
            if (snapshot.empty) {
                console.log("Firestore query returned no documents for the logged in user.");
            } else {
                console.log("Firestore query returned documents. Count:", snapshot.size);
            }

            const vendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderVendas(vendas); // Renderiza as vendas após buscá-las
        } catch (error) {
            console.error("Erro ao carregar vendas do Firestore: ", error);
        }
    }

    // Funções para os botões
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
                    alert("Erro ao tentar imprimir: Função de impressão não encontrada.");
                }

            } else {
                console.error("Venda não encontrada com o ID:", vendaId);
                alert("Erro: Venda não encontrada para gerar a 2ª via.");
            }
        } catch (error) {
            console.error("Erro ao buscar venda para 2ª via:", error);
            alert("Erro ao buscar detalhes da venda para impressão.");
        }
    };

    window.editarVenda = async (vendaId) => {
        console.log(`Abrir edição para venda com ID: ${vendaId}`);
        try {
            const vendaDoc = await db.collection("vendas").doc(vendaId).get();
            if (vendaDoc.exists) {
                currentEditingSale = { id: vendaDoc.id, ...vendaDoc.data() };
                openEditModal(currentEditingSale);
            } else {
                console.error("Venda não encontrada com o ID:", vendaId);
                alert("Erro: Venda não encontrada para edição.");
            }
        } catch (error) {
            console.error("Erro ao buscar venda para edição:", error);
            alert("Erro ao buscar detalhes da venda para edição.");
        }
    };

    window.cancelarVenda = (vendaId) => {
        console.log(`Cancelar venda com ID: ${vendaId}`);
        alert(`Funcionalidade de Cancelar para a venda ${vendaId} ainda não implementada.`);
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
            vendaCard.classList.add('transacao-card');

            const itensHTML = venda.itens.map(item => `
                <li>${item.quantidade}x ${item.nome} (${formatarPreco(item.preco)})</li>
            `).join('');

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

    // --- Lógica do Modal de Edição ---
    const editModal = document.createElement('div');
    editModal.id = 'edit-sale-modal';
    editModal.classList.add('modal');
    editModal.style.display = 'none';
    editModal.innerHTML = `
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <h2>Editar Venda <span id="edit-sale-id"></span></h2>
            <div id="edit-sale-items-container"></div>
            <button id="add-new-item-button">Adicionar Novo Item</button>
            <p><strong>Total Original:</strong> <span id="original-total-value"></span></p>
            <p><strong>Novo Total:</strong> <span id="new-total-value"></span></p>
            <p><strong>Diferencial:</strong> <span id="differential-value" style="font-weight: bold;"></span></p>
            <div class="modal-actions">
                <button id="save-edit-button">Salvar Edição</button>
                <button id="cancel-edit-button">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(editModal);

    const closeButton = editModal.querySelector('.close-button');
    closeButton.addEventListener('click', () => { editModal.style.display = 'none'; });

    const cancelEditButton = editModal.querySelector('#cancel-edit-button');
    cancelEditButton.addEventListener('click', () => { editModal.style.display = 'none'; });

    const saveEditButton = editModal.querySelector('#save-edit-button');
    saveEditButton.addEventListener('click', async () => {
        const newItems = [];
        let newTotal = 0;
        document.querySelectorAll('.edit-item-row').forEach(row => {
            const productSelect = row.querySelector('.product-select');
            const quantityInput = row.querySelector('.quantity-input');
            const selectedOption = productSelect.options[productSelect.selectedIndex];

            if (selectedOption && quantityInput && selectedOption.value) {
                const productId = selectedOption.value;
                 // Extrai o nome do produto do texto, removendo a parte do preço
                const productName = selectedOption.textContent.split(' (R$')[0];
                const itemPrice = parseFloat(selectedOption.dataset.price);
                const quantity = parseInt(quantityInput.value);

                if (productId && quantity > 0 && !isNaN(itemPrice)) {
                    newItems.push({
                        id: productId,
                        nome: productName,
                        preco: itemPrice,
                        quantidade: quantity
                    });
                    newTotal += (quantity * itemPrice);
                }
            }
        });

        const originalTotal = currentEditingSale.valorTotal;
        const differential = newTotal - originalTotal;

        const confirmationMessage = `
Resumo da Edição:
--------------------------
Total Original: ${formatarPreco(originalTotal)}
Novo Total: ${formatarPreco(newTotal)}
Diferencial: ${formatarPreco(differential)}
--------------------------
${differential > 0 ? `O cliente deve pagar a diferença de: ${formatarPreco(differential)}` : ''}
${differential < 0 ? `O cliente deve receber de troco: ${formatarPreco(Math.abs(differential))}` : ''}

Deseja salvar estas alterações? A operação de pagamento ou troco da diferença deve ser feita manualmente.
        `;

        if (confirm(confirmationMessage)) {
            try {
                // Atualiza o documento no Firestore
                await db.collection("vendas").doc(currentEditingSale.id).update({
                    itens: newItems,
                    valorTotal: newTotal,
                    // Nota: O valorPago e troco originais são mantidos. 
                    // A diferença deve ser tratada manualmente pelo operador.
                    // Adicionamos um log da edição para referência futura.
                    editHistory: firebase.firestore.FieldValue.arrayUnion({
                        timestamp: new Date(),
                        user: loggedInUser || 'unknown',
                        originalTotal: originalTotal,
                        newTotal: newTotal,
                        differential: differential
                    })
                });

                alert("Venda atualizada com sucesso!");
                editModal.style.display = 'none';
                
                // Recarrega as vendas para mostrar os dados atualizados
                await fetchVendasFromFirestore();

            } catch (error) {
                console.error("Erro ao atualizar a venda:", error);
                alert("Ocorreu um erro ao salvar as alterações. Por favor, tente novamente.");
            }
        }
    });


    const add_new_item_button = editModal.querySelector('#add-new-item-button');
    add_new_item_button.addEventListener('click', () => createEditableItemRow());


    function calculateNewTotal() {
        let newTotal = 0;
        document.querySelectorAll('.edit-item-row').forEach(row => {
            const productSelect = row.querySelector('.product-select');
            const quantityInput = row.querySelector('.quantity-input');
            const selectedOption = productSelect.options[productSelect.selectedIndex];

            if (selectedOption && quantityInput && selectedOption.value && !isNaN(parseFloat(selectedOption.dataset.price)) && !isNaN(parseInt(quantityInput.value))) {
                const itemPrice = parseFloat(selectedOption.dataset.price);
                const quantity = parseInt(quantityInput.value);
                newTotal += (quantity * itemPrice);
            }
        });
        document.getElementById('new-total-value').textContent = formatarPreco(newTotal);
        const originalTotal = currentEditingSale.valorTotal;
        const differential = newTotal - originalTotal;
        const differentialEl = document.getElementById('differential-value');
        differentialEl.textContent = formatarPreco(differential);
        differentialEl.style.color = differential >= 0 ? 'green' : 'red';
    }

    function createEditableItemRow(item = null) {
        const itemsContainer = document.getElementById('edit-sale-items-container');
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('edit-item-row');
        
        let optionsHtml = '<option value="">Selecione um produto</option>';
        allProducts.forEach(product => {
            // Compara pelo nome do produto para o 'selected'
            const selected = item && item.nome === product.nome ? 'selected' : '';
            optionsHtml += `<option value="${product.id}" data-price="${product.preco}" ${selected}>${product.nome} (${formatarPreco(product.preco)})</option>`;
        });

        itemDiv.innerHTML = `
            <select class="product-select" ${item ? '' : 'autofocus'}>
                ${optionsHtml}
            </select>
            <input type="number" min="1" value="${item ? item.quantidade : 1}" class="quantity-input">
            <button class="remove-item-button" title="Remover item">❌</button>
        `;
        itemsContainer.appendChild(itemDiv);

        const productSelect = itemDiv.querySelector('.product-select');
        const quantityInput = itemDiv.querySelector('.quantity-input');
        const removeItemButton = itemDiv.querySelector('.remove-item-button');

        productSelect.addEventListener('change', calculateNewTotal);
        quantityInput.addEventListener('input', calculateNewTotal);
        removeItemButton.addEventListener('click', () => {
            itemDiv.remove();
            calculateNewTotal();
        });
    }


    function openEditModal(venda) {
        document.getElementById('edit-sale-id').textContent = venda.id;
        document.getElementById('original-total-value').textContent = formatarPreco(venda.valorTotal);
        
        const itemsContainer = document.getElementById('edit-sale-items-container');
        itemsContainer.innerHTML = ''; // Limpa os itens anteriores

        venda.itens.forEach(item => {
            createEditableItemRow(item);
        });

        calculateNewTotal(); // Calcula o total inicial do modal
        editModal.style.display = 'block';
    }

    // Estilos básicos para o modal
    const modalStyles = `
        .modal {
            display: none; 
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.5);
        }
        .modal-content {
            background-color: #fefefe;
            margin: 8% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 90%;
            max-width: 600px;
            border-radius: 8px;
            position: relative;
            box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
        }
        .close-button {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        .close-button:hover, .close-button:focus {
            color: black;
            text-decoration: none;
            cursor: pointer;
        }
        .edit-item-row {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 10px;
            padding: 8px;
            border: 1px solid #eee;
            border-radius: 4px;
        }
        .edit-item-row select { flex: 3; }
        .edit-item-row input { flex: 1; }
        .edit-item-row button {
            padding: 5px;
            background-color: transparent;
            border: none;
            cursor: pointer;
            font-size: 16px;
        }
        #add-new-item-button {
            background-color: #008CBA;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
        }
        .modal-actions {
            text-align: right;
            margin-top: 20px;
        }
        .modal-actions button {
            padding: 10px 15px;
            margin-left: 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        #save-edit-button { background-color: #4CAF50; color: white; }
        #cancel-edit-button { background-color: #f44336; color: white; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = modalStyles;
    document.head.appendChild(styleSheet);


    // Inicializar a página
    async function inicializarMinhasTransacoes() {
        await fetchProducts(); // Carrega os produtos antes de tudo
        await fetchVendasFromFirestore();
    }

    inicializarMinhasTransacoes();
});