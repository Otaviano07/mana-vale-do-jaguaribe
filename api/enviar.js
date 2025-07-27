const formidable = require('formidable');

module.exports = async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    const url = 'https://docs.google.com/forms/d/e/1FAIpQLSc5Q5NN8K9SraLjdnu0y5QLeiIHhazrNOPARRRBgtTSZrxDDQ/formResponse';

    console.log('api/enviar.js: Requisição recebida.');

    if (req.method !== 'POST') {
        console.log('api/enviar.js: Método não permitido.');
        return res.status(405).send('Method Not Allowed');
    }

    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('api/enviar.js: Erro ao parsear dados do formulário:', err);
            return res.status(500).send('Error parsing form data');
        }

        console.log('api/enviar.js: Dados do formulário parseados. Campos:', fields);

        const formData = new URLSearchParams();
        for (const key in fields) {
            formData.append(key, fields[key][0]);
        }

        console.log('api/enviar.js: FormData preparado para o Google Forms:', formData.toString());

        try {
            console.log('api/enviar.js: Enviando requisição para o Google Forms...');
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            console.log('api/enviar.js: Resposta do Google Forms recebida. Status:', response.status, response.statusText);

            if (response.ok) {
                res.status(200).send('Form submission forwarded successfully.');
                console.log('api/enviar.js: Encaminhamento bem-sucedido.');
            } else {
                console.error('api/enviar.js: Google Forms respondeu com um erro:', response.status, response.statusText);
                res.status(response.status).send('Error forwarding to Google Forms');
            }
        } catch (error) {
            console.error('api/enviar.js: Erro ao encaminhar submissão do formulário:', error);
            res.status(500).send('Server error');
        }
    });
};