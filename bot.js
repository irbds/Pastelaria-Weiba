const TelegramBot = require('node-telegram-bot-api');

const token = '7942843336:AAFogMXGP_jW7d_w9DvDUmHFgoyFqd0zs5s'; 
const bot = new TelegramBot(token, { polling: true });

const menu = {
    1: { nome: "Pastel de Carne", preco: 5.00 },
    2: { nome: "Pastel de Queijo", preco: 5.00 },
    3: { nome: "Pastel de Pizza", preco: 6.00 },
    4: { nome: "Pastel de Frango", preco: 6.00 }
};

const frete = {
    "carapicuiba": 2.00,
    "barueri": 4.00,
    "jandira": 8.00,
    "osasco": 8.00
};

let pedidos = {};
let aguardandoEntrega = {};
let aguardandoPagamento = false;

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    pedidos[chatId] = [];
    aguardandoEntrega[chatId] = false; 
    bot.sendMessage(chatId, "Bem-vindo à Pastelaria! Digite /cardapio para ver o nosso menu.");
});

bot.onText(/\/cardapio/, (msg) => {
    const chatId = msg.chat.id;
    let menuMessage = "🍴 *Cardápio da Pastelaria* 🍴\n\n";
    for (const id in menu) {
        menuMessage += `*${id}* - ${menu[id].nome} - R$ ${menu[id].preco.toFixed(2)}\n`;
    }
    menuMessage += "\nDigite o número do pastel para adicionar ao pedido.";
    bot.sendMessage(chatId, menuMessage, { parse_mode: 'Markdown' });
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const texto = msg.text.trim().toLowerCase();

    if (pedidos[chatId] === undefined) pedidos[chatId] = [];

    const itemId = parseInt(texto);
    if (menu[itemId]) {
        pedidos[chatId].push(menu[itemId]);
        bot.sendMessage(chatId, `Você adicionou *${menu[itemId].nome}* por R$ ${menu[itemId].preco.toFixed(2)} ao seu pedido.\nDeseja adicionar mais itens? Digite o número do próximo pastel ou "finalizar" para concluir o pedido.`, { parse_mode: 'Markdown' });
    } else if (texto === "finalizar") {
        const total = pedidos[chatId].reduce((sum, item) => sum + item.preco, 0);
        let resumoPedido = "🧾 *Resumo do seu pedido:* \n";
        pedidos[chatId].forEach((item, index) => {
            resumoPedido += `${index + 1}. ${item.nome} - R$ ${item.preco.toFixed(2)}\n`;
        });
        resumoPedido += `\n*Subtotal: R$ ${total.toFixed(2)}*\n`;
        resumoPedido += "Gostaria de *retirar* no local ou *entrega*?";

        bot.sendMessage(chatId, resumoPedido, { parse_mode: 'Markdown' });
        aguardandoEntrega[chatId] = true; 
    } else if (aguardandoEntrega[chatId] && (texto === "retirar" || texto === "entrega")) {
        const numeroPedido = Math.floor(1000 + Math.random() * 9000); 
        if (texto === "retirar") {
            bot.sendMessage(chatId, `Você escolheu retirar.\nNosso endereço é:\n*Av. Francisco Pignatari, 650 - Vila Gustavo Correia, Carapicuíba - SP, 06310-390*\nSeu número de pedido é: *${numeroPedido}*\nSeu pedido estará pronto em cerca de *40 minutos* para retirada.\nQual método de pagamento você prefere? (cartão de débito, cartão de crédito, pix ou dinheiro)`, { parse_mode: 'Markdown' });
            aguardandoEntrega[chatId] = false;
            aguardandoPagamento = true;
        } else if (texto === "entrega") {
            bot.sendMessage(chatId, "Por favor, informe o endereço de entrega e a cidade (Carapicuíba, Barueri, Jandira ou Osasco) para calcularmos o frete.");
            aguardandoEntrega[chatId] = "esperando_endereco"; 
        }
    } else if (aguardandoEntrega[chatId] === "esperando_endereco") {
        let cidade = "";
        for (const key in frete) {
            if (texto.includes(key)) {
                cidade = key;
                break;
            }
        }

        if (cidade) {
            const total = pedidos[chatId].reduce((sum, item) => sum + item.preco, 0);
            const custoFrete = frete[cidade];
            const totalComFrete = total + custoFrete;
            const numeroPedido = Math.floor(1000 + Math.random() * 9000); 

            bot.sendMessage(chatId, `Seu pedido será entregue em ${cidade.charAt(0).toUpperCase() + cidade.slice(1)}.\n*Frete: R$ ${custoFrete.toFixed(2)}*\n*Total com frete: R$ ${totalComFrete.toFixed(2)}*\nSeu número de pedido é: *${numeroPedido}*\nQual método de pagamento você prefere? (cartão de débito, cartão de crédito, pix ou dinheiro)`, { parse_mode: 'Markdown' });
            aguardandoEntrega[chatId] = false;
            aguardandoPagamento = true; 
        } else {
            bot.sendMessage(chatId, "Ah, que pena! O endereço não está na nossa área de entrega. Por favor, informe uma cidade válida (Carapicuíba, Barueri, Jandira ou Osasco).");
        }
    } else if (aguardandoPagamento && (texto === "cartão de débito" || texto === "cartão de crédito" || texto === "pix")) {
        bot.sendMessage(chatId, `Você escolheu pagamento por ${texto}.\nObrigado pelo seu pedido!`);
        pedidos[chatId] = [];
        aguardandoPagamento = false;
    } else if (aguardandoPagamento && texto === "dinheiro") {
        bot.sendMessage(chatId, "Você escolheu pagamento em dinheiro. Você precisa de troco? (sim ou não)");
        aguardandoPagamento = "esperando_troco"; 
    } else if (aguardandoPagamento === "esperando_troco" && (texto === "sim" || texto === "não")) {
        if (texto === "sim") {
            bot.sendMessage(chatId, "Troco para quantos reais?");
            aguardandoPagamento = "esperando_valor_troco"; 
        } else {
            bot.sendMessage(chatId, "Ok, você não precisará de troco. Obrigado pelo seu pedido!");
            pedidos[chatId] = [];
            aguardandoPagamento = false;
        }
    } else if (aguardandoPagamento === "esperando_valor_troco") {
        const valorTroco = parseFloat(texto);
        if (!isNaN(valorTroco)) {
            bot.sendMessage(chatId, `Você precisará de troco de R$ ${valorTroco.toFixed(2)}. Obrigado pelo seu pedido!`);
            pedidos[chatId] = [];
            aguardandoPagamento = false;
        } else {
            bot.sendMessage(chatId, "Por favor, informe um valor válido para o troco.");
        }
    } else if (!texto.startsWith("/")) {
        bot.sendMessage(chatId, "Não entendi. Por favor, digite o número do pastel para adicionar ao pedido, 'finalizar' para concluir, ou 'retirar' ou 'entrega' para continuar.");
    }
});