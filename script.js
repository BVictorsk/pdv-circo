// --- Lógica Completa e Corrigida (script.js) ---

// Removida a declaração de 'db' daqui para evitar duplicação.
// 'db' agora é inicializado em firebase-config.js e é acessível globalmente.

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => { // Made async to use await
            event.preventDefault();

            const usuarioId = document.getElementById('usuario').value;
            const senha = document.getElementById('senha').value;
            const troco = parseFloat(document.getElementById('troco').value.replace(',', '.'));

            if (isNaN(troco)) {
                console.error('Troco inicial inválido.');
                return;
            }

            if (typeof db === 'undefined' || db === null) {
                console.error("Error: Firestore 'db' object is not defined or null. Ensure firebase-config.js is loaded correctly.");
                console.error("Erro de conexão: Não foi possível acessar o banco de dados. Verifique sua configuração.");
                return;
            }

            try {
                const userDoc = await db.collection("usuarios").doc(usuarioId).get();

                if (userDoc.exists) {
                    const userData = userDoc.data();
                    // In a real application, passwords should be hashed and compared securely.
                    // For this example, we're doing a direct comparison.
                    if (userData.senha === senha) {
                        sessionStorage.setItem('loggedInUser', usuarioId);
                        sessionStorage.setItem('loggedInUserAccessType', userData.tipoAcesso);
                        sessionStorage.setItem('trocoInicial', troco);
                        window.location.href = 'pdv.html';
                    } else {
                        console.error('Senha incorreta.');
                    }
                } else {
                    console.error('Usuário não encontrado.');
                }
            } catch (error) {
                console.error("Erro ao autenticar usuário: ", error);
                console.error("Erro ao tentar fazer login. Verifique o console para mais detalhes.");
            }
        });
    }

    // --- Lógica da Tela de PDV (pdv.html) ---

    // SENHA_SUPERVISOR pode ser removida se o controle de acesso for feito por tipoAcesso do Firestore
    // Por enquanto, vou mantê-la e adicionar uma verificação baseada no tipoAcesso
    const SENHA_SUPERVISOR = '5678'; // Manter por compatibilidade, mas idealmente substituir por checagem de tipoAcesso

    let carrinho = [];
    let valorTotal = 0;
    let valorPago = 0;
    let valorRestante = 0;
    let trocoNecessario = 0;
    let pagamentosEfetuados = [];
    let produtosDoFirestore = []; // Nova variável para armazenar produtos do Firestore
    let vendaEmEdicaoId = null; // Guarda o ID da venda que está sendo editada

    const acessoRapidoGrid = document.getElementById('acesso-rapido-grid');
    const outrosProdutosGrid = document.getElementById('outros-produtos-grid');
    const carrinhoLista = document.getElementById('carrinho-lista');
    const userDisplay = document.getElementById('user-display');
    const carrinhoResumoDiv = document.querySelector('.pdv-carrinho .carrinho-resumo');
    const brindeContainer = document.getElementById('brinde-container');
    const themeSwitcher = document.getElementById('btn-theme-switcher');
    const body = document.body;

    // Elementos de busca
    const buscaProdutoInput = document.getElementById('busca-produto-input');
    const btnLimparBusca = document.getElementById('btn-limpar-busca');
    const btnConfirmarBusca = document.getElementById('btn-confirmar-busca');


    if(themeSwitcher) {
        themeSwitcher.addEventListener('click', () => {
            body.classList.toggle('light-theme');
            const isLightTheme = body.classList.contains('light-theme');
            themeSwitcher.textContent = isLightTheme ? 'Tema Escuro' : 'Tema Claro';
        });
    }

    // Listener para o botão de minimizar/maximizar "Outros Produtos" (fora do if acessoRapidoGrid)
    const btnToggleOutrosProdutos = document.getElementById('btn-toggle-outros-produtos');
    if (btnToggleOutrosProdutos) {
        btnToggleOutrosProdutos.addEventListener('click', () => {
            const outrosProdutosGrid = document.getElementById('outros-produtos-grid');
            outrosProdutosGrid.classList.toggle('collapsed');
            
            // Atualizar texto do botão
            if (outrosProdutosGrid.classList.contains('collapsed')) {
                btnToggleOutrosProdutos.textContent = '▶ Expandir';
            } else {
                btnToggleOutrosProdutos.textContent = '▼ Recolher';
            }
        });
    }

    // --- FUNÇÕES DE LÓGICA CENTRAL ---

    if (acessoRapidoGrid) {
        const loggedInUser = sessionStorage.getItem('loggedInUser');
        if (loggedInUser) {
            userDisplay.textContent = loggedInUser;
        }

        const formatarPreco = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

        // Função para formatar o preço com vírgula automática ao digitar
        function formatarValorMonetarioAoDigitar(event) {
            let input = event.target;
            let val = input.value.replace(/\D/g, ""); // Remove tudo que não for número

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

            // Remove zeros à esquerda do inteiro (ex: 050 -> 50)
            inteiro = inteiro.replace(/^0+(?=\d)/, "");

            input.value = `${inteiro},${decimal}`;
        }

        // Nova função para buscar produtos do Firestore
        async function fetchProductsFromFirestore() {
            // A verificação de 'db' agora é importante aqui, pois não estamos declarando-o localmente.
            if (typeof db === 'undefined' || db === null) {
                console.error("Error: Firestore 'db' object is not defined or null. Ensure firebase-config.js is loaded correctly.");
                return [];
            }
            try {
                const snapshot = await db.collection("produtos").get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error("Erro ao carregar produtos do Firestore: ", error);
                return [];
            }
        }

        const calcularTotalEAtualizarResumo = () => {
            valorTotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
            valorRestante = valorTotal - valorPago;
            trocoNecessario = Math.max(0, valorPago - valorTotal);

            carrinhoResumoDiv.innerHTML = ''; // Limpa o resumo para reconstruir

            // Container para os totais
            const resultadoContainer = document.createElement('div');
            resultadoContainer.classList.add('resultado-container');

            if (carrinho.length > 0) {
                if (valorRestante > 0) {
                    resultadoContainer.innerHTML = `<div class="carrinho-total" style="color: var(--yellow-warning);"><span>FALTA:</span><span class="valor">${formatarPreco(valorRestante)}</span></div>`;
                } else {
                    const cor = trocoNecessario > 0 ? 'var(--green-success)' : 'var(--text-light)';
                    const label = trocoNecessario > 0 ? 'TROCO' : 'TOTAL';
                    const valorDisplay = trocoNecessario > 0 ? formatarPreco(trocoNecessario) : formatarPreco(valorTotal);
                    const textoBotao = vendaEmEdicaoId ? 'ATUALIZAR VENDA' : 'FINALIZAR VENDA';
                    resultadoContainer.innerHTML = `<div class="carrinho-total" style="color: ${cor};"><span>${label}:</span><span class="valor">${valorDisplay}</span></div><button class="btn-primary btn-finalizar" id="btn-finalizar">${textoBotao}</button>`;
                }
            } else {
                 resultadoContainer.innerHTML = `<div class="carrinho-total"><span>TOTAL:</span><span class="valor">${formatarPreco(0)}</span></div>`;
            }
            carrinhoResumoDiv.appendChild(resultadoContainer);
            
            // Adiciona opções de pagamento e cancelar
            if(carrinho.length > 0) {
                // Renderiza pagamentos já efetuados apenas se houverem
                if (pagamentosEfetuados.length > 0) {
                    carrinhoResumoDiv.insertAdjacentHTML('beforeend',
                        '<ul class="pagamentos-lista">' +
                        pagamentosEfetuados.map((p, index) => `<li class="pagamento-item">${p.tipo.toUpperCase()}: ${formatarPreco(p.valor)} <button class="btn-remover-pagamento" data-index="${index}">✕</button></li>`).join('') +
                        '</ul>'
                    );
                    
                    // Adicionar listeners para botões de remover pagamento
                    carrinhoResumoDiv.querySelectorAll('.btn-remover-pagamento').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            const index = parseInt(e.target.getAttribute('data-index'));
                            removerPagamento(index);
                        });
                    });
                }

                carrinhoResumoDiv.insertAdjacentHTML('beforeend', '<p class="carrinho-pagamento">Pagamento:</p><div class="opcoes-pagamento" id="opcoes-pagamento"></div><button class="btn-pagamento btn-cancelar" id="btn-cancelar">❌ Cancelar Pedido</button>');
                renderizarOpcoesPagamento();
            }
            
            reassociarListenersGerais();
        };

        const reassociarListenersGerais = () => {
            const btnCancelar = document.getElementById('btn-cancelar');
            if (btnCancelar) {
                 btnCancelar.addEventListener('click', cancelarPedido);
            }
            const btnFinalizar = document.getElementById('btn-finalizar');
            if (btnFinalizar) {
                btnFinalizar.addEventListener('click', () => finalizarVenda('PAGO'));
            }

            const btnBrinde = document.getElementById('btn-dar-brinde');
            if (btnBrinde) {
                 btnBrinde.addEventListener('click', mostrarInputBrinde);
            }
        }

        const finalizarVenda = async (tipoFinalizacao = 'PAGO') => {
            if (carrinho.length === 0) {
                 console.log('Adicione itens ao carrinho para finalizar a venda.');
                 return;
            }

            if (tipoFinalizacao === 'PAGO' && valorRestante > 0) {
                console.log('Ainda faltam ' + formatarPreco(valorRestante) + ' para completar o pagamento.');
                return;
            }

            // --- LÓGICA FIREBASE PRIMEIRO ---
            try {
                if (typeof db === 'undefined' || db === null) {
                    console.error("Error: Firestore 'db' object is not defined or null. Ensure firebase-config.js is loaded correctly.");
                    console.error("Erro de conexão: Não foi possível acessar o banco de dados. Verifique sua configuração.");
                    return;
                }

                const today = new Date();
                const day = today.getDate().toString().padStart(2, '0');
                const month = (today.getMonth() + 1).toString().padStart(2, '0');
                const year = today.getFullYear();
                const dateFormattedForId = `${day}${month}${year}`;

                // Use YYYY-MM-DD for the counter document field, as it's better for sorting/querying
                const dateStringForCounter = `${year}-${month}-${day}`;

                let vendaId = null;

                await db.runTransaction(async (transaction) => {
                    const counterRef = db.collection("daily_counters").doc(loggedInUser);
                    const counterDoc = await transaction.get(counterRef);

                    let currentCount = 0;
                    if (counterDoc.exists && counterDoc.data()[dateStringForCounter]) {
                        currentCount = counterDoc.data()[dateStringForCounter];
                    }

                    const newCount = currentCount + 1;
                    transaction.set(counterRef, { [dateStringForCounter]: newCount }, { merge: true });

                    // Construct the vendaId with the desired format: operador-DDMMYYYY-count
                    vendaId = `${loggedInUser}-${dateFormattedForId}-${newCount}`;
                    const vendaRef = db.collection("vendas").doc(vendaId);

                    transaction.set(vendaRef, {
                        itens: carrinho,
                        valorTotal: valorTotal,
                        valorPago: valorPago,
                        troco: trocoNecessario,
                        pagamentos: pagamentosEfetuados,
                        tipo: tipoFinalizacao,
                        operador: loggedInUser || 'N/A',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                
                console.log("Venda salva com sucesso no Firestore! ID: ", vendaId);

                // 2. Se salvou, imprime o recibo (passando o ID da venda)
                if (vendaId) {
                    imprimirRecibo(vendaId, carrinho, valorTotal, pagamentosEfetuados, trocoNecessario, formatarPreco, loggedInUser); // Passa o ID da venda e os parâmetros necessários para a função global
                }

                // 3. Limpa o estado
                carrinho = [];
                valorPago = 0;
                valorTotal = 0;
                trocoNecessario = 0;
                pagamentosEfetuados = [];
                renderizarCarrinho();
                renderizarBotaoBrinde();

            } catch (error) {
                // Se der erro ao salvar, avisa o usuário e não continua
                console.error("Erro ao salvar venda: ", error);
                console.error("ERRO CRÍTICO: A venda NÃO foi salva no banco de dados. A impressão foi cancelada. Verifique sua conexão ou as regras do Firebase. Tente novamente.");
            }
            // --- FIM LÓGICA FIREBASE ---
        };

        const cancelarPedido = () => {
            if (carrinho.length > 0) {
                console.log('Pedido cancelado.');
                carrinho = [];
                valorPago = 0;
                valorTotal = 0;
                trocoNecessario = 0;
                pagamentosEfetuados = [];
                renderizarCarrinho();
            } else {
                console.log('O carrinho já está vazio.');
            }
        };

        const renderizarBotaoBrinde = () => {
             brindeContainer.innerHTML = `
                <button class="btn-brinde" id="btn-dar-brinde">
                    🎁 Dar Brinde (Cortesia)
                </button>
            `;
            document.getElementById('btn-dar-brinde').addEventListener('click', mostrarInputBrinde);
        }

        const mostrarInputBrinde = () => {
            if (carrinho.length === 0) {
                console.log('Adicione itens ao carrinho para dar um brinde.');
                return;
            }

            brindeContainer.innerHTML = `
                <div style="display: flex; gap: 5px; align-items: center; background-color: var(--blue-info); padding: 5px; border-radius: 8px;">
                    <input type="password"
                           id="brinde-senha-input"
                           class="input-field"
                           placeholder="Senha Supervisor"
                           style="flex-grow: 1; padding: 8px; font-size: 14px; border: none;">
                    <button id="btn-confirmar-brinde" class="btn-primary" style="padding: 8px 12px;">
                        🔑 OK
                    </button>
                    <button id="btn-cancelar-brinde" class="btn-controle btn-cancelar-item" style="padding: 4px; width: 20px; height: 20px; font-size: 14px;">
                        &times;
                    </button>
                </div>
            `;

            document.getElementById('btn-confirmar-brinde').addEventListener('click', processarBrinde);
            document.getElementById('btn-cancelar-brinde').addEventListener('click', renderizarBotaoBrinde);
            document.getElementById('brinde-senha-input').focus();
        };

        const processarBrinde = () => {
            const senhaInput = document.getElementById('brinde-senha-input');
            const senhaDigitada = senhaInput.value;
            const loggedInUserAccessType = sessionStorage.getItem('loggedInUserAccessType');

            // Allow only Admin or A&O to give freebies
            if (loggedInUserAccessType === 'Admin' || loggedInUserAccessType === 'A&O') {
                 // In a real application, consider a supervisor password in Firestore for this action.
                 // For simplicity, we are still using a fixed SENHA_SUPERVISOR.
                if (senhaDigitada === SENHA_SUPERVISOR) {
                    valorPago = valorTotal;
                    pagamentosEfetuados = [{ tipo: 'BRINDE (Cortesia)', valor: valorTotal }];
                    finalizarVenda('BRINDE');
                } else {
                    console.error('Senha incorreta para dar brinde.');
                    senhaInput.value = '';
                    senhaInput.focus();
                }
            } else {
                console.error('Você não tem permissão para dar brindes.');
                senhaInput.value = '';
                renderizarBotaoBrinde(); // Restore the original button
            }
        };

        const processarPagamento = (tipo, valor) => {
            if (valorTotal === 0) return;

            pagamentosEfetuados.push({ tipo: tipo, valor: valor });
            valorPago += valor;

            renderizarOpcoesPagamento();
            calcularTotalEAtualizarResumo();
        };

        const removerPagamento = (index) => {
            if (index < 0 || index >= pagamentosEfetuados.length) return;
            
            const pagamentoRemovido = pagamentosEfetuados[index];
            valorPago -= pagamentoRemovido.valor;
            pagamentosEfetuados.splice(index, 1);
            
            calcularTotalEAtualizarResumo();
            reassociarListenersGerais();
        };

        const renderizarBotaoPagamento = (tipo) => {
             const classes = {
                'pix': 'btn-pix',
                'debito': 'btn-debito',
                'credito': 'btn-credito',
                'dinheiro': 'btn-dinheiro'
            };
            const icones = {
                'pix': '💳 PIX (QR Code)',
                'debito': '💳 Débito',
                'credito': '💳 Crédito',
                'dinheiro': '💵 Dinheiro'
            };

            return `
                <button class="btn-pagamento ${classes[tipo]}" data-tipo="${tipo}">
                    ${icones[tipo]}
                </button>
            `;
        }

        const renderizarOpcoesPagamento = (inputAtivo = null) => {
            const opcoesContainer = document.getElementById('opcoes-pagamento');
            if (!opcoesContainer) return;

            if (valorRestante <= 0 && valorPago > 0) {
                opcoesContainer.innerHTML = '';
                return;
            }

            const tipos = ['pix', 'debito', 'credito', 'dinheiro'];
            let valorSugerido = valorRestante > 0 ? valorRestante : valorTotal;
             if (valorPago > 0) {
                valorSugerido = Math.max(0, valorRestante);
            } else if (valorTotal > 0) {
                valorSugerido = valorTotal;
            } else {
                valorSugerido = 0;
            }

            const opcoesHTML = tipos.map(tipo => {
                if (tipo === inputAtivo) {
                    const displayValue = (valorSugerido > 0 ? valorSugerido.toFixed(2) : '0.00').replace('.', ',');
                    return `
                        <div class="input-pagamento-container" data-tipo="${tipo}">
                            <input type="text"
                                   id="input-${tipo}"
                                   class="input-pagamento-valor"
                                   placeholder="0,00"
                                   value="${displayValue}"
                                   min="0"
                                   step="0.01">
                            <button class="btn-confirmar-pagamento" data-tipo="${tipo}">
                                OK
                            </button>
                        </div>
                    `;
                }
                return renderizarBotaoPagamento(tipo);
            }).join('');

            opcoesContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
            opcoesContainer.innerHTML = opcoesHTML;

            opcoesContainer.querySelectorAll('.btn-pagamento').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tipo = e.currentTarget.getAttribute('data-tipo');
                    if (opcoesContainer.querySelector('.input-pagamento-container')?.getAttribute('data-tipo') === tipo) {
                        renderizarOpcoesPagamento();
                    } else {
                        renderizarOpcoesPagamento(tipo);
                    }
                });
            });

            const btnConfirmar = opcoesContainer.querySelector('.btn-confirmar-pagamento');
            if (btnConfirmar) {
                btnConfirmar.addEventListener('click', (e) => {
                    const tipoPagamento = e.currentTarget.getAttribute('data-tipo');
                    const input = document.getElementById(`input-${tipoPagamento}`);
                    let valorDigitado = parseFloat(input.value.replace(',', '.')); // Converte para float

                    if (isNaN(valorDigitado) || valorDigitado <= 0) {
                        renderizarOpcoesPagamento();
                        return;
                    }
                    processarPagamento(tipoPagamento, valorDigitado);
                });
            }

            const inputElement = opcoesContainer.querySelector('.input-pagamento-valor');
            if (inputElement) {
                inputElement.focus();
                inputElement.select(); // Seleciona o texto para facilitar a digitação
                 inputElement.addEventListener('input', formatarValorMonetarioAoDigitar); // Adiciona a formatação automática
                 inputElement.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        btnConfirmar.click();
                    }
                     if (e.key === 'Escape') {
                        e.preventDefault();
                         renderizarOpcoesPagamento();
                    }
                });
            }
        };

        const renderizarCarrinho = () => {
            if (carrinho.length === 0) {
                carrinhoLista.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 50px;">Carrinho vazio.</p>';
            } else {
                carrinhoLista.innerHTML = '';
            }

            carrinho.forEach(item => {
                const listItem = document.createElement('div');
                listItem.classList.add('carrinho-item');

                listItem.innerHTML = `
                    <div class="item-header">${item.nome}</div>
                    <div class="item-footer">
                        <div class="item-acoes-esquerda">
                             <button class="btn-controle btn-cancelar-item" data-id="${item.id}" data-acao="cancelarItem">
                                &times;
                            </button>
                            <div class="item-preco-qtde">
                                ${formatarPreco(item.preco)} x ${item.quantidade}
                            </div>
                        </div>
                        <div class="item-controles-direita">
                            <button class="btn-controle btn-controle-diminuir" data-id="${item.id}" data-acao="diminuir">
                                -
                            </button>
                            <span class="quantidade-display">${item.quantidade}</span>
                            <button class="btn-controle" data-id="${item.id}" data-acao="aumentar">
                                +
                            </button>
                        </div>
                    </div>
                `;
                carrinhoLista.appendChild(listItem);
            });

            carrinhoLista.querySelectorAll('.btn-controle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = e.currentTarget.getAttribute('data-id');
                    const acao = e.currentTarget.getAttribute('data-acao');
                    manipularQuantidade(itemId, acao);
                });
            });

            calcularTotalEAtualizarResumo();
            renderizarOpcoesPagamento();
        };

        const manipularQuantidade = (itemId, acao) => {
            const index = carrinho.findIndex(item => item.id === itemId);

            if (index > -1) {
                if (acao === 'aumentar') {
                    carrinho[index].quantidade += 1;
                } else if (acao === 'diminuir') {
                    carrinho[index].quantidade -= 1;
                } else if (acao === 'cancelarItem') {
                    carrinho.splice(index, 1);
                    valorPago = 0;
                    pagamentosEfetuados = [];
                    renderizarCarrinho();
                    return;
                }

                if (carrinho[index] && carrinho[index].quantidade <= 0) {
                    carrinho.splice(index, 1);
                    valorPago = 0;
                    pagamentosEfetuados = [];
                }

                renderizarCarrinho();
            }
        };

        // Modificada para usar produtosDoFirestore e nova estrutura de card
        const renderizarProdutos = (filtro = '') => {
            if (!acessoRapidoGrid || !outrosProdutosGrid) return;

            acessoRapidoGrid.innerHTML = '';
            outrosProdutosGrid.innerHTML = '';

            const termoBusca = filtro.toLowerCase().trim();
            const produtosFiltrados = produtosDoFirestore.filter(produto => {
                // Filtra SOMENTE por ID do produto
                return produto.id.toLowerCase().includes(termoBusca);
            });


            produtosFiltrados.forEach(produto => {
                const card = document.createElement('div');
                card.classList.add('produto-card'); // Usar a classe geral para styling
                card.setAttribute('data-id', produto.id);

                const precoFormatado = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(produto.preco);
                const acessoRapidoTag = produto.acessoRapido ? '<div class="acesso-rapido-info">⚡</div>' : '';

                card.innerHTML = `
                    <div class="card-header">
                        <div class="icone">${produto.icone || '❓'}</div>
                        <div class="product-title-group">
                            <div class="nome">${produto.nome}</div>
                            <div class="product-id-display">ID: ${produto.id}</div>
                        </div>
                        <!-- Botões de ação (editar/excluir) removidos para o PDV -->
                    </div>
                    <div class="card-body">
                        ${acessoRapidoTag}
                        <div class="preco">R$ ${precoFormatado}</div>
                    </div>
                `;

                card.addEventListener('click', () => {
                    adicionarAoCarrinho(produto);
                });

                if (produto.acessoRapido) {
                    acessoRapidoGrid.appendChild(card);
                } else {
                    outrosProdutosGrid.appendChild(card);
                }
            });

            // Se não houver filtro, ou o filtro estiver vazio, mostramos uma mensagem para ambos os grids.
            // Se houver filtro e nenhum resultado, também mostramos a mensagem.
            if (produtosFiltrados.length === 0 && termoBusca !== '') {
                outrosProdutosGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Nenhum produto encontrado com este ID.</p>';
                acessoRapidoGrid.innerHTML = ''; // Limpar o grid de acesso rápido se não houver resultados.
            } else if (produtosFiltrados.length === 0 && termoBusca === '') {
                 // Caso não haja produtos cadastrados e o filtro esteja vazio
                 outrosProdutosGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Nenhum produto cadastrado.</p>';
                 acessoRapidoGrid.innerHTML = '';
            }
        };

        const adicionarAoCarrinho = (produto) => {
            const itemExistente = carrinho.find(item => item.id === produto.id);

            if (itemExistente) {
                itemExistente.quantidade += 1;
            } else {
                carrinho.push({ ...produto, quantidade: 1 });
            }
            valorPago = 0;
            pagamentosEfetuados = [];

            renderizarCarrinho();
        };

        // Adicionar listeners para a busca
        if (buscaProdutoInput && btnLimparBusca && btnConfirmarBusca) {
            // Ao digitar, mostrar o botão "X" para limpar
            buscaProdutoInput.addEventListener('keyup', () => {
                const termoBusca = buscaProdutoInput.value.trim();
                if (termoBusca.length > 0) {
                    btnLimparBusca.style.display = 'inline-block';
                } else {
                    btnLimparBusca.style.display = 'none';
                }
            });

            // Ao clicar em "Confirmar", buscar o produto pelo ID e adicionar ao carrinho
            btnConfirmarBusca.addEventListener('click', () => {
                const idBuscado = buscaProdutoInput.value.trim().toLowerCase();
                
                if (!idBuscado) {
                    alert('Por favor, digite um ID de produto.');
                    return;
                }
                
                // Buscar o produto exato com esse ID
                const produtoEncontrado = produtosDoFirestore.find(p => p.id.toLowerCase() === idBuscado);
                
                if (produtoEncontrado) {
                    adicionarAoCarrinho(produtoEncontrado);
                    buscaProdutoInput.value = '';
                    btnLimparBusca.style.display = 'none';
                    alert(`${produtoEncontrado.nome} adicionado ao carrinho!`);
                } else {
                    alert(`Produto com ID "${idBuscado}" não encontrado.`);
                }
            });

            // Ao clicar em "X", limpar o campo
            btnLimparBusca.addEventListener('click', () => {
                buscaProdutoInput.value = '';
                btnLimparBusca.style.display = 'none';
                buscaProdutoInput.focus();
            });

            // Permitir também pressionar Enter para confirmar a busca
            buscaProdutoInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    btnConfirmarBusca.click();
                }
            });
        }


        // Chamar fetchProductsFromFirestore antes de renderizar produtos
        async function inicializarPDV() {
            produtosDoFirestore = await fetchProductsFromFirestore();
            renderizarProdutos(); // Renderiza todos os produtos inicialmente
            renderizarCarrinho();
            renderizarBotaoBrinde();
        }

        inicializarPDV();
    }
});