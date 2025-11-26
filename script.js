
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
        { id: 'H01', nome: 'Hot Dog', preco: 15.00, icone: '🌭', rapido: true },
        { id: 'P01', nome: 'Pipoca Doce', preco: 12.00, icone: '🍿', rapido: true },
        { id: 'A01', nome: 'Água', preco: 5.00, icone: '💧', rapido: true },
        { id: 'R01', nome: 'Refrigerante', preco: 8.00, icone: '🥤', rapido: true },
        { id: 'P02', nome: 'Pipoca Salgada', preco: 10.00, icone: '🍿', rapido: false },
        { id: 'C01', nome: 'Algodão Doce', preco: 7.00, icone: '🍭', rapido: false },
        { id: 'B01', nome: 'Brinquedo (Lojinha)', preco: 45.00, icone: '🎈', rapido: false },
        { id: 'F01', nome: 'Foto Porta-Retrato', preco: 60.00, icone: '🖼️', rapido: false },
    ];

    const SENHA_SUPERVISOR = '5678'; 
    let carrinho = []; 
    let valorTotal = 0;
    let valorPago = 0;
    let valorRestante = 0;
    let trocoNecessario = 0;
    let pagamentosEfetuados = []; 

    const alternarInputPagamento acessoRapidoGrid = document.getElementById('acesso-rapido-grid');
    const outrosProdutosGrid = document.getElementById('outros-produtos-grid');
    const carrinhoLista = document.getElementById('carrinho-lista');
    const userDisplay = document.getElementById('user-display');
    const carrinhoResumoDiv = document.querySelector('.pdv-carrinho .carrinho-resumo');
    const brindeContainer = document.getElementById('brinde-container');
    const themeSwitcher = document.getElementById('btn-theme-switcher');
    const body = document.body;

    if(themeSwitcher) {
        themeSwitcher.addEventListener('click', () => {
            body.classList.toggle('light-theme');
            const isLightTheme = body.classList.contains('light-theme');
            themeSwitcher.textContent = isLightTheme ? 'Mudar para Tema Escuro' : 'Mudar para Tema Claro';
        });
    }

    // --- FUNÇÕES DE LÓGICA CENTRAL ---
    
    if (acessoRapidoGrid) {
        if (sessionStorage.getItem('loggedInUser')) {
            userDisplay.textContent = sessionStorage.getItem('loggedInUser');
        } 

        const formatarPreco = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

        const calcularTotalEAtualizarResumo = () => {
            valorTotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
            valorRestante = valorTotal - valorPago;

            let resumoHTML = '';
            
            let pagamentosListaHTML = pagamentosEfetuados.length > 0 ? 
                '<ul class="pagamentos-lista">' + pagamentosEfetuados.map(p => 
                    `<li class="pagamento-item">${p.tipo.toUpperCase()}: ${formatarPreco(p.valor)}</li>`
                ).join('') + '</ul>' 
                : '';

            const pagamentoHeader = carrinho.length > 0 ? '<p class="carrinho-pagamento">Pagamento:</p>' : '';
            
            const opcoesPagamentoEBotaoCancelar = `
                ${pagamentosListaHTML}
                <div class="opcoes-pagamento" id="opcoes-pagamento">
                    </div>
                <button class="btn-pagamento btn-cancelar" id="btn-cancelar">
                    ❌ Cancelar Pedido
                </button>
            `;

            const resultadoContainer = carrinhoResumoDiv.querySelector('.resultado-container') || document.createElement('div');
            resultadoContainer.classList.add('resultado-container');

            if (valorRestante > 0 && carrinho.length > 0) {
                resumoHTML = `
                    <div class="carrinho-total" style="color: var(--yellow-warning);">
                        <span>FALTA:</span>
                        <span class="valor" id="total-valor">${formatarPreco(valorRestante)}</span>
                    </div>
                `;
            } else if (carrinho.length > 0) {
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
                trocoNecessario = 0;
                resumoHTML = `
                    <div class="carrinho-total">
                        <span>TOTAL:</span>
                        <span class="valor" id="total-valor">${formatarPreco(0)}</span>
                    </div>
                `;
            }

            resultadoContainer.innerHTML = resumoHTML;

            carrinhoResumoDiv.innerHTML = '';
            carrinhoResumoDiv.appendChild(resultadoContainer);
            carrinhoResumoDiv.insertAdjacentHTML('beforeend', pagamentoHeader);
            
            if (valorRestante > 0 || valorPago === 0 && carrinho.length > 0) {
                carrinhoResumoDiv.insertAdjacentHTML('beforeend', opcoesPagamentoEBotaoCancelar);
            } else if (carrinho.length > 0) {
                carrinhoResumoDiv.insertAdjacentHTML('beforeend', pagamentosListaHTML);
                carrinhoResumoDiv.insertAdjacentHTML('beforeend', `<button class="btn-pagamento btn-cancelar" id="btn-cancelar" style="grid-column: span 2;">❌ Cancelar Pedido</button>`);
            }
            
            if (valorRestante > 0 || valorPago === 0 && carrinho.length > 0) {
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

        const imprimirRecibo = () => {
            const data = new Date();
            const dataFormatada = `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}`;
            
            let itensRecibo = carrinho.map(item => `
                <tr>
                    <td>${item.quantidade}x ${item.nome}</td>
                    <td>${formatarPreco(item.preco * item.quantidade)}</td>
                </tr>
            `).join('');

            let pagamentosRecibo = pagamentosEfetuados.map(p => `
                <p><strong>${p.tipo.toUpperCase()}:</strong> ${formatarPreco(p.valor)}</p>
            `).join('');

            const conteudoRecibo = `
                <html>
                <head>
                    <title>Recibo</title>
                    <style>
                        body { font-family: 'Courier New', monospace; font-size: 10px; color: #000; }
                        .recibo-container { width: 280px; margin: 0 auto; }
                        h2 { text-align: center; margin-bottom: 10px; font-size: 14px; }
                        p { margin: 2px 0; }
                        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        th, td { text-align: left; padding: 2px; }
                        .total { font-weight: bold; font-size: 12px; }
                        hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
                    </style>
                </head>
                <body>
                    <div class="recibo-container">
                        <h2>Circus Max PDV</h2>
                        <p>Data: ${dataFormatada}</p>
                        <p>Operador: ${sessionStorage.getItem('loggedInUser') || 'N/A'}</p>
                        <hr>
                        <table>
                            ${itensRecibo}
                        </table>
                        <hr>
                        <p class="total">TOTAL: ${formatarPreco(valorTotal)}</p>
                        ${pagamentosRecibo}
                        ${trocoNecessario > 0 ? `<p class="total">TROCO: ${formatarPreco(trocoNecessario)}</p>` : ''}
                        <hr>
                        <p style="text-align: center;">Obrigado e volte sempre!</p>
                    </div>
                </body>
                </html>
            `;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(conteudoRecibo);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };

        const finalizarVenda = async (tipoFinalizacao = 'PAGO') => {
            if (carrinho.length === 0) {
                 alert('Adicione itens ao carrinho para finalizar a venda.');
                 return;
            }

            if (tipoFinalizacao === 'PAGO' && valorRestante > 0) {
                alert('Ainda faltam ' + formatarPreco(valorRestante) + ' para completar o pagamento.');
                return;
            }

            // --- LÓGICA FIREBASE PRIMEIRO ---
            try {
                // 1. Salva a venda no Firestore
                await db.collection("vendas").add({
                    itens: carrinho,
                    valorTotal: valorTotal,
                    valorPago: valorPago,
                    troco: trocoNecessario,
                    pagamentos: pagamentosEfetuados,
                    tipo: tipoFinalizacao,
                    operador: sessionStorage.getItem('loggedInUser') || 'N/A',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("Venda salva com sucesso no Firestore!");

                // 2. Se salvou, imprime o recibo
                imprimirRecibo(); 

                // 3. Informa o usuário e limpa o estado
                let troco = trocoNecessario > 0 ? formatarPreco(trocoNecessario) : 'Nenhum';
                let mensagemTipo = tipoFinalizacao === 'BRINDE' ? 'BRINDE/CORTESIA' : 'PAGO';
                
                alert(`
                    Venda Finalizada como ${mensagemTipo}!\n
                    Recibo impresso.\n
                    ------------------------------\n
                    Total da Compra: ${formatarPreco(valorTotal)}\n
                    Valor Registrado: ${formatarPreco(valorPago)}\n
                    ${tipoFinalizacao === 'PAGO' ? 'Troco a ser dado: ' + troco : ''}
                `);

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
                alert("ERRO CRÍTICO: A venda NÃO foi salva no banco de dados. A impressão foi cancelada. Verifique sua conexão ou as regras do Firebase. Tente novamente.");
            }
            // --- FIM LÓGICA FIREBASE ---
        };

        const cancelarPedido = () => {
            if (carrinho.length > 0) {
                if (confirm('Tem certeza que deseja cancelar o pedido atual?')) {
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

            if (senhaDigitada === SENHA_SUPERVISOR) {
                valorPago = valorTotal; 
                pagamentosEfetuados = [{ tipo: 'BRINDE (Cortesia)', valor: valorTotal }];
                finalizarVenda('BRINDE'); 
            } else {
                alert('Senha incorreta.');
                senhaInput.value = '';
                senhaInput.focus();
            }
        };
        
        const alternarInputPagamento = (btnElement, tipo) => {
            if (carrinho.length === 0) return;
            
            document.querySelectorAll('.input-pagamento-container').forEach(container => {
                const tipoAntigo = container.getAttribute('data-tipo');
                container.outerHTML = renderizarBotaoPagamento(tipoAntigo);
            });
            
            let valorSugerido = valorRestante > 0 ? valorRestante : valorTotal;
            if (valorPago > 0) {
                valorSugerido = Math.max(0, valorRestante);
            } else if (valorTotal > 0) {
                valorSugerido = valorTotal;
            } else {
                valorSugerido = 0;
            }

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
                        OK
                    </button>
                </div>
            `;
            
            btnElement.outerHTML = inputHTML;
            
            document.querySelector('.btn-confirmar-pagamento').addEventListener('click', (e) => {
                const tipoPagamento = e.currentTarget.getAttribute('data-tipo');
                const input = document.getElementById(`input-${tipoPagamento}`);
                let valorDigitado = parseFloat(input.value);

                if (isNaN(valorDigitado) || valorDigitado <= 0) {
                    renderizarOpcoesPagamento(); 
                    return;
                }
                
                processarPagamento(tipoPagamento, valorDigitado);
            });

            const inputElement = document.getElementById(`input-${tipo}`);
            if(inputElement) inputElement.focus();
        };
        
        const processarPagamento = (tipo, valor) => {
            if (valorTotal === 0) return;
            
            pagamentosEfetuados.push({ tipo: tipo, valor: valor });
            valorPago += valor;
            
            renderizarOpcoesPagamento(); 
            calcularTotalEAtualizarResumo();
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
        
        const renderizarOpcoesPagamento = () => {
            if (valorRestante <= 0 && valorPago > 0) return;

             const opcoesHTML = `
                ${renderizarBotaoPagamento('pix')}
                ${renderizarBotaoPagamento('debito')} 
                ${renderizarBotaoPagamento('credito')} 
                ${renderizarBotaoPagamento('dinheiro')}
             `;
            
            const opcoesContainer = document.getElementById('opcoes-pagamento');
            if (opcoesContainer) {
                opcoesContainer.style.gridTemplateColumns = 'repeat(2, 1fr)'; 
                opcoesContainer.innerHTML = opcoesHTML;

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

        renderizarProdutos();
        renderizarCarrinho();
        renderizarBotaoBrinde();
    }
});
