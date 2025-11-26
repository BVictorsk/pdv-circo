document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.firestore();

    // TABS
    const tablinks = document.getElementsByClassName("tablinks");
    const tabcontent = document.getElementsByClassName("tabcontent");

    window.openTab = function(evt, tabName) {
        for (let i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        for (let i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    }

    document.getElementById("defaultOpen").click();

    // PRODUTOS
    const btnAdicionarItem = document.getElementById('btn-adicionar-item');
    const formAdicionarItem = document.getElementById('form-adicionar-item');
    const btnSalvarItem = document.getElementById('btn-salvar-item');

    btnAdicionarItem.addEventListener('click', () => {
        formAdicionarItem.style.display = 'block';
    });

    btnSalvarItem.addEventListener('click', () => {
        const icone = document.getElementById('item-icone').value;
        const id = document.getElementById('item-id').value;
        const nome = document.getElementById('item-nome').value;
        const preco = parseFloat(document.getElementById('item-preco').value);
        const rapido = document.getElementById('item-rapido').checked;

        if (id && nome && !isNaN(preco)) {
            db.collection('produtos').doc(id).set({
                icone: icone,
                id: id,
                nome: nome,
                preco: preco,
                rapido: rapido
            }).then(() => {
                console.log('Produto salvo com sucesso!');
                formAdicionarItem.style.display = 'none';
                // You might want to reload the product list here
            }).catch(error => {
                console.error('Erro ao salvar produto: ', error);
            });
        }
    });
});
