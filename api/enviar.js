const formidable = require('formidable');

module.exports = async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    const url = 'https://docs.google.com/forms/d/e/1FAIpQLSc5Q5NN8K9SraLjdnu0y5QLeiIHhazrNOPARRRBgtTSZrxDDQ/formResponse';

    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Error parsing form data:', err);
            return res.status(500).send('Error parsing form data');
        }

        const formData = new URLSearchParams();
        for (const key in fields) {
            // formidable retorna os campos como arrays, então pegamos o primeiro elemento
            formData.append(key, fields[key][0]);
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            if (response.ok) {
                res.status(200).send('Form submission forwarded successfully.');
            } else {
                console.error('Google Forms responded with an error:', response.status, response.statusText);
                res.status(response.status).send('Error forwarding to Google Forms');
            }
        } catch (error) {
            console.error('Error forwarding form submission:', error);
            res.status(500).send('Server error');
        }
    });
};