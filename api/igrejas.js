module.exports = async (req, res) => {
    
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSGocezfQekt9igT7GkM-by02hnL0ELUqtM-m3AySn1vqJ7gUdg7dJlz2nZpereA_le8_amweck88nr/pub?gid=1639594837&single=true&output=tsv';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).send('Error fetching data');
        }
        const data = await response.text();
        res.setHeader('Content-Type', 'text/plain');
        res.send(data);
    } catch (error) {
        res.status(500).send('Server error');
    }
};