export async function fetchTsvData(url) {
    try {
        const urlWithCacheBuster = `${url}&_t=${new Date().getTime()}`;
        const response = await fetch(urlWithCacheBuster);
        if (!response.ok) {
            throw new Error(`HTTP error! code: ${response.status}`);
        }
        const dataText = await response.text();
        const lines = dataText.trim().split('\n');
        const headers = lines[0].trim().split('\t');

        const parsedData = [];
        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i].trim();
            if (currentLine === '') continue;

            const values = currentLine.split('\t');
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header.trim()] = values[index] ? values[index].trim() : '';
            });
            parsedData.push(rowData);
        }
        return parsedData;
    } catch (error) {
        console.error("Falha ao buscar ou processar o arquivo TSV:", error);
        throw error; 
    }
}

export function formatTEL(value) {
    // Remove todos os caracteres não numéricos para obter apenas os dígitos.
    let cleaned = ('' + value).replace(/\D/g, '');

    // Limita o número de dígitos a 11 (DDD + 9 + número).
    cleaned = cleaned.substring(0, 11);

    // Monta a string formatada em partes, de forma progressiva.
    const parts = [];

    // Adiciona o parêntese de abertura e os dois primeiros dígitos (DDD).
    if (cleaned.length > 0) {
        parts.push('(' + cleaned.substring(0, 2));
    }

    // Adiciona o parêntese de fechamento e o primeiro bloco de números.
    if (cleaned.length > 2) {
        // O tamanho do bloco central depende se é um celular (11 dígitos) ou fixo (10 dígitos).
        const middleGroupSize = cleaned.length > 10 ? 5 : 4;
        parts.push(') ' + cleaned.substring(2, 2 + middleGroupSize));
    }

    // Adiciona o hífen e o segundo bloco de números.
    if (cleaned.length > 6) {
        const middleGroupSize = cleaned.length > 10 ? 5 : 4;
        const startOfLastGroup = 2 + middleGroupSize;
        
        // Garante que o hífen só seja adicionado se houver números no último bloco.
        if (cleaned.substring(startOfLastGroup)) {
           parts.push('-' + cleaned.substring(startOfLastGroup, startOfLastGroup + 4));
        }
    }

    // Junta as partes para formar a string final.
    return parts.join('');
}