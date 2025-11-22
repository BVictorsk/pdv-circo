// --- Lógica Completa e Corrigida (script.js) ---

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const usuario = document.getElementById('usuario').value;
            const senha = document.getElementById('senha').value;
            const troco = parseFloat(document.getElementById('troco').value.replace(',', '.'));

            if (usuario === 'demo' && senha === '1234' && !isNaN(troco)) {
                sessionStorage.setItem('loggedInUser', usuario);
                sessionStorage.setItem('trocoInicial', troco);
                window.location.href = 'pdv.html';
            } else {
                alert('Credenciais inválidas ou troco inicial inválido. Use "demo" e "1234".');
            }
        });
    }

    // --- Lógica da Tela de PDV (pdv.html) ---
    
    const produtos = [
        { id: 'H01', nome: 'Hot Dog', preco: 15.00, icone: '&#x1F32D;', rapido: true },
        { id: 'P01', nome: 'Pipoca Doce', preco: 12.00, icone: '&#x1F37F;', rapido: true },
        { id: 'A01', nome: 'Água', preco: 5.00, icone: '&#x1F4A7;', rapido: true },
        { id: 'R01', nome: 'Refrigerante', preco: 8.00, icone: '&#x1F964;', rapido: true },
        { id: 'P02', nome: 'Pipoca Salgada', preco: 10.00, icone: '&#x1F37F;', rapido: false },
        { id: 'C01', nome: 'Algodão Doce', preco: 7.00, icone: '&#x1F36C;', rapido: false },
        { id: 'B01', nome: 'Brinquedo (Lojinha)', preco: 45.00, icone: '&#x1F388;', rapido: false },
        { id: 'F01', nome: 'Foto Porta-Retrato', preco: 60.00, icone: '&#x1F5BC;', rapido: false },
    ];

    const SENHA_SUPERVISOR = '5678'; 
    let carrinho = []; 
    let valorTotal = 0;
    let valorPago = 0;
    let valorRestante = 0;
    let trocoNecessario = 0;
    let pagamentosEfetuados = []; 

    const acessoRapidoGrid = document.getElementById('acesso-rapido-grid');
    const outrosProdutosGrid = document.getElementById('outros-produtos-grid');
    const carrinhoLista = document.getElementById('carrinho-lista');
    const userDisplay = document.getElementById('user-display');
    const carrinhoResumoDiv = document.querySelector('.pdv-carrinho .carrinho-resumo');
    const brindeContainer = document.getElementById('brinde-container'); // NOVO: Container do brinde

    // --- FUNÇÕES DE LÓGICA CENTRAL ---
    
    if (acessoRapidoGrid) {
        if (sessionStorage.getItem('loggedInUser')) {
            userDisplay.textContent = sessionStorage.getItem('loggedInUser');
        } 

        const formatarPreco = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

        // Função principal de cálculo e atualização do resumo (TOTAL/FALTA/TROCO)
        const calcularTotalEAtualizarResumo = () => {
            valorTotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
            valorRestante = valorTotal - valorPago;

            let resumoHTML = '';
            
            // 1. Pagamentos já efetuados (Lista)
            let pagamentosListaHTML = pagamentosEfetuados.length > 0 ? 
                '<ul class="pagamentos-lista">' + pagamentosEfetuados.map(p => 
                    `<li class="pagamento-item">${p.tipo.toUpperCase()}: ${formatarPreco(p.valor)}</li>`
                ).join('') + '</ul>' 
                : '';

            // 2. Cabeçalho de Pagamento
            const pagamentoHeader = carrinho.length > 0 ? '<p class="carrinho-pagamento">Pagamento:</p>' : '';
            
            // 3. Estrutura de Botões (vazia, será preenchida por renderizarOpcoesPagamento)
            const opcoesPagamentoEBotaoCancelar = `
                ${pagamentosListaHTML}
                <div class="opcoes-pagamento" id="opcoes-pagamento">
                    </div>
                <button class="btn-pagamento btn-cancelar" id="btn-cancelar">
                    &#x274C; Cancelar Pedido
                </button>
            `;

            const resultadoContainer = carrinhoResumoDiv.querySelector('.resultado-container') || document.createElement('div');
            resultadoContainer.classList.add('resultado-container');

            // --- Lógica de Estado (TOTAL, FALTA, TROCO, FINALIZAR) ---
            if (valorRestante > 0 && carrinho.length > 0) {
                // Pagamento Parcial (FALTA) 
                resumoHTML = `
                    <div class="carrinho-total" style="color: var(--yellow-warning);">
                        <span>FALTA:</span>
                        <span class="valor" id="total-valor">${formatarPreco(valorRestante)}</span>
                    </div>
                `;
            } else if (carrinho.length > 0) {
                // Pagamento Completo (Troco ou Exato) - Aparece FINALIZAR
                trocoNecessario = Math.max(0, valorPago - valorTotal);
                const cor = trocoNecessario > 0 ? 'var(--green-success)' : 'var(--text-light)';
                const label = trocoNecessario > 0 ? 'TROCO' : 'TOTAL';
                const valorDisplay = trocoNecessario > 0 ? formatarPreco(trocoNecessario) : formatarPreco(valorTotal);
                const textoFinalizar = trocoNecessario > 0 ? `FINALIZAR VENDA (Troco: ${formatarPreco(trocoNecessario)})` : 'FINALIZAR VENDA';

                resumoHTML = `
                    <div class="carrinho-total" style="color: ${cor};">
                        <span>${label}:</span>
                        <span class="valor" id="total-valor">${valorDisplay}</span>
                    </div>
                    <button class="btn-primary btn-finalizar" id="btn-finalizar">
                        ${textoFinalizar}
                    </button>
                `;
            } else {
                 // Carrinho Vazio
                trocoNecessario = 0;
                resumoHTML = `
                    <div class="carrinho-total">
                        <span>TOTAL:</span>
                        <span class="valor" id="total-valor">${formatarPreco(0)}</span>
                    </div>
                `;
            }

            resultadoContainer.innerHTML = resumoHTML;

            // Limpa e reconstrói o conteúdo do resumo para manter a ordem
            carrinhoResumoDiv.innerHTML = '';
            carrinhoResumoDiv.appendChild(resultadoContainer);
            carrinhoResumoDiv.insertAdjacentHTML('beforeend', pagamentoHeader);
            
            // Só exibe as opções de pagamento se ainda houver valor restante (ou se o carrinho não for vazio e não tiver pago nada)
            if (valorRestante > 0 || valorPago === 0 && carrinho.length > 0) {
                carrinhoResumoDiv.insertAdjacentHTML('beforeend', opcoesPagamentoEBotaoCancelar);
            } else if (carrinho.length > 0) {
                 // Se o pagamento já foi completado, só exibe a lista de pagamentos e o botão de cancelar/finalizar
                carrinhoResumoDiv.insertAdjacentHTML('beforeend', pagamentosListaHTML);
                carrinhoResumoDiv.insertAdjacentHTML('beforeend', `<button class="btn-pagamento btn-cancelar" id="btn-cancelar" style="grid-column: span 2;">&#x274C; Cancelar Pedido</button>`);
            }
            
            
            // Se ainda falta pagar, renderiza os botões de pagamento e associa os listeners
            if (valorRestante > 0 || valorPago === 0 && carrinho.length > 0) {
                renderizarOpcoesPagamento();
            }

            // Reassocia todos os listeners
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

            // Reassocia o listener do botão Brinde original (se estiver visível)
            const btnBrinde = document.getElementById('btn-dar-brinde');
            if (btnBrinde) {
                 btnBrinde.addEventListener('click', mostrarInputBrinde);
            }
        }

        // 5. Função de Finalização de Venda
        const finalizarVenda = (tipoFinalizacao = 'PAGO') => {
            if (carrinho.length === 0) {
                 alert('Adicione itens ao carrinho para finalizar a venda.');
                 return;
            }

            if (tipoFinalizacao === 'PAGO' && valorRestante > 0) {
                alert('Ainda faltam R$ ' + valorRestante.toFixed(2).replace('.', ',') + ' para completar o pagamento.');
                return;
            }

            let troco = trocoNecessario > 0 ? formatarPreco(trocoNecessario) : 'Nenhum';
            let mensagemTipo = tipoFinalizacao === 'BRINDE' ? 'BRINDE/CORTESIA' : 'PAGO';
            
            alert(`
                Venda Finalizada como ${mensagemTipo}!
                ------------------------------
                Total da Compra: ${formatarPreco(valorTotal)}
                Valor Registrado: ${formatarPreco(valorPago)}
                ${tipoFinalizacao === 'PAGO' ? 'Troco a ser dado: ' + troco : ''}
            `);

            // Reseta o estado da venda
            carrinho = [];
            valorPago = 0;
            valorTotal = 0;
            trocoNecessario = 0;
            pagamentosEfetuados = []; 
            renderizarCarrinho();
            
            // Garante que o botão de brinde volte ao normal
            renderizarBotaoBrinde();
        };

        // 6. Função de Cancelamento de Pedido
        const cancelarPedido = () => {
            if (carrinho.length > 0) {
                if (confirm('Tem certeza que deseja cancelar o pedido atual? O carrinho será limpo e o pagamento será resetado.')) {
                    carrinho = []; 
                    valorPago = 0;
                    valorTotal = 0;
                    trocoNecessario = 0;
                    pagamentosEfetuados = []; 
                    renderizarCarrinho();
                }
            } else {
                alert('O carrinho já está vazio.');
            }
        };
        
        // --- Lógica do Input de Senha Brinde (NOVA) ---

        const renderizarBotaoBrinde = () => {
             brindeContainer.innerHTML = `
                <button class="btn-brinde" id="btn-dar-brinde">
                    &#x1F381; Dar Brinde (Cortesia)
                </button>
            `;
            document.getElementById('btn-dar-brinde').addEventListener('click', mostrarInputBrinde);
        }

        const mostrarInputBrinde = () => {
            if (carrinho.length === 0) {
                alert('Adicione itens ao carrinho para dar um brinde.');
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
                        &#x1F513; OK
                    </button>
                    <button id="btn-cancelar-brinde" class="btn-controle btn-cancelar-item" style="padding: 4px; width: 20px; height: 20px; font-size: 14px;">
                        &times;
                    </button>
                </div>
            `;
            
            // Adiciona Listeners
            document.getElementById('btn-confirmar-brinde').addEventListener('click', processarBrinde);
            document.getElementById('btn-cancelar-brinde').addEventListener('click', renderizarBotaoBrinde);
            document.getElementById('brinde-senha-input').focus();
        };
        
        const processarBrinde = () => {
            const senhaInput = document.getElementById('brinde-senha-input');
            const senhaDigitada = senhaInput.value;

            if (senhaDigitada === SENHA_SUPERVISOR) {
                // Senha correta: Trata o pedido como pago (Brinde)
                
                // Simula o pagamento total (valor pago = valor total)
                valorPago = valorTotal; 
                pagamentosEfetuados = [{ tipo: 'BRINDE (Cortesia)', valor: valorTotal }];
                
                // Finaliza a venda
                finalizarVenda('BRINDE'); 

            } else {
                // Senha incorreta
                alert('Senha incorreta. A venda não foi autorizada como brinde.');
                senhaInput.value = '';
                senhaInput.focus();
                // O botão de brinde permanece como input para nova tentativa
            }
        };
        // --- Fim Lógica do Input de Senha Brinde ---


        
        // 7. Manipula a mudança de forma de pagamento para input
        const alternarInputPagamento = (btnElement, tipo) => {
            if (carrinho.length === 0) return;
            
            // 1. Garante que todos os inputs ativos voltem a ser botões antes de abrir um novo input
            document.querySelectorAll('.input-pagamento-container').forEach(container => {
                const tipoAntigo = container.getAttribute('data-tipo');
                container.outerHTML = renderizarBotaoPagamento(tipoAntigo);
            });
            
            // 2. Determina o valor sugerido
            let valorSugerido = valorRestante > 0 ? valorRestante : valorTotal;
            if (valorPago > 0) {
                valorSugerido = Math.max(0, valorRestante);
            } else if (valorTotal > 0) {
                valorSugerido = valorTotal;
            } else {
                valorSugerido = 0;
            }

            // 3. Cria o HTML do input
            const inputHTML = `
                <div class="input-pagamento-container" data-tipo="${tipo}">
                    <input type="number" 
                           id="input-${tipo}"
                           class="input-pagamento-valor" 
                           placeholder="${formatarPreco(valorSugerido)}"
                           value="${valorSugerido > 0 ? valorSugerido.toFixed(2) : '0.00'}"
                           min="0"
                           step="0.01">
                    <button class="btn-confirmar-pagamento" data-tipo="${tipo}">
                        CONFIRMAR
                    </button>
                </div>
            `;
            
            // 4. Substitui o botão original pelo input
            btnElement.outerHTML = inputHTML;
            
            // 5. Adiciona listener ao novo botão de confirmação
            document.querySelector('.btn-confirmar-pagamento').addEventListener('click', (e) => {
                const tipoPagamento = e.currentTarget.getAttribute('data-tipo');
                const input = document.getElementById(`input-${tipoPagamento}`);
                let valorDigitado = parseFloat(input.value);

                if (isNaN(valorDigitado) || valorDigitado <= 0) {
                    // Volta para o estado de botão se o valor for inválido ou zero
                    renderizarOpcoesPagamento(); 
                    return;
                }
                
                // Processa o pagamento
                processarPagamento(tipoPagamento, valorDigitado);
            });

            // Foca no campo de input
            const inputElement = document.getElementById(`input-${tipo}`);
            if(inputElement) inputElement.focus();
        };
        
        // 8. Processa o valor inserido (GARANTE QUE OS BOTÕES VOLTEM AO NORMAL)
        const processarPagamento = (tipo, valor) => {
            if (valorTotal === 0) return;
            
            // Adiciona o pagamento à lista
            pagamentosEfetuados.push({ tipo: tipo, valor: valor });

            // Atualiza o valor pago total
            valorPago += valor;
            
            // 1. Renderiza novamente a área de pagamento para restaurar os botões
            renderizarOpcoesPagamento(); 
            
            // 2. Recalcula e atualiza o resumo (FALTA/TROCO/FINALIZAR)
            calcularTotalEAtualizarResumo();
        };

        // 9. Estrutura para renderizar um botão (Atualizado para débito e crédito)
        const renderizarBotaoPagamento = (tipo) => {
             const classes = {
                'pix': 'btn-pix',
                'debito': 'btn-debito', 
                'credito': 'btn-credito', 
                'dinheiro': 'btn-dinheiro'
            };
            const icones = {
                'pix': '&#x1F4F6; PIX (QR Code)',
                'debito': '&#x1F4B3; Débito',
                'credito': '&#x1F4B3; Crédito',
                'dinheiro': '&#x1F4B5; Dinheiro'
            };
            
            return `
                <button class="btn-pagamento ${classes[tipo]}" data-tipo="${tipo}">
                    ${icones[tipo]}
                </button>
            `;
        }

        // 10. Renderiza a Estrutura do Carrinho (Produtos)
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

            // Adiciona listeners para todos os botões de controle do item
            carrinhoLista.querySelectorAll('.btn-controle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = e.currentTarget.getAttribute('data-id');
                    const acao = e.currentTarget.getAttribute('data-acao');
                    manipularQuantidade(itemId, acao);
                });
            });

            // Chama as funções de resumo e pagamento (Atualiza o lado direito do PDV)
            calcularTotalEAtualizarResumo();
            renderizarOpcoesPagamento(); 
        };
        
        // 11. Renderiza os Botões de Opções de Pagamento (Dinâmico)
        const renderizarOpcoesPagamento = () => {
             // Só renderiza os botões se houver valor restante OU se ainda não houve pagamento (valorPago === 0)
            if (valorRestante <= 0 && valorPago > 0) return;

             const opcoesHTML = `
                ${renderizarBotaoPagamento('pix')}
                ${renderizarBotaoPagamento('debito')} 
                ${renderizarBotaoPagamento('credito')} 
                ${renderizarBotaoPagamento('dinheiro')}
             `;
            
            const opcoesContainer = document.getElementById('opcoes-pagamento');
            if (opcoesContainer) {
                 // Mantém o grid de 2 colunas para 4 botões
                opcoesContainer.style.gridTemplateColumns = 'repeat(2, 1fr)'; 
                opcoesContainer.innerHTML = opcoesHTML;

                // Reassocia listeners aos novos botões restaurados
                opcoesContainer.querySelectorAll('.btn-pagamento').forEach(btn => {
                    if (!btn.classList.contains('btn-cancelar')) {
                        btn.addEventListener('click', (e) => {
                            const tipo = e.currentTarget.getAttribute('data-tipo');
                            alternarInputPagamento(e.currentTarget, tipo);
                        });
                    }
                });
            }
        };


        // 3. Função para Manipular Quantidade 
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


        // Inicialização: Renderiza os cartões de produtos
        const renderizarProdutos = () => {
            if (!acessoRapidoGrid || !outrosProdutosGrid) return;

            acessoRapidoGrid.innerHTML = '';
            outrosProdutosGrid.innerHTML = '';

            produtos.forEach(produto => {
                const card = document.createElement('div');
                card.classList.add('produto-card');
                card.setAttribute('data-id', produto.id);
                card.innerHTML = `
                    <div class="icone">${produto.icone}</div>
                    <div class="nome">${produto.nome}</div>
                    <div class="preco">${formatarPreco(produto.preco)}</div>
                `;
                
                card.addEventListener('click', () => {
                    adicionarAoCarrinho(produto);
                });

                if (produto.rapido) {
                    acessoRapidoGrid.appendChild(card);
                } else {
                    outrosProdutosGrid.appendChild(card);
                }
            });
        };
        
        // Adiciona ao carrinho
        const adicionarAoCarrinho = (produto) => {
            const itemExistente = carrinho.find(item => item.id === produto.id);

            if (itemExistente) {
                itemExistente.quantidade += 1;
            } else {
                carrinho.push({ ...produto, quantidade: 1 });
            }
            // Reseta o pagamento ao alterar o carrinho
            valorPago = 0; 
            pagamentosEfetuados = [];
            
            // CHAMADA PRINCIPAL PARA ATUALIZAR A TELA
            renderizarCarrinho();
        };

        // Inicialização ao carregar a página
        renderizarProdutos();
        renderizarCarrinho();
        renderizarBotaoBrinde(); // Inicializa o botão de brinde
    }
});