Vue.createApp({
    data() {
        return {
            products: [],
            dataUrlProducts: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSGocezfQekt9igT7GkM-by02hnL0ELUqtM-m3AySn1vqJ7gUdg7dJlz2nZpereA_le8_amweck88nr/pub?gid=0&single=true&output=tsv',
            dataUrlChurch: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSGocezfQekt9igT7GkM-by02hnL0ELUqtM-m3AySn1vqJ7gUdg7dJlz2nZpereA_le8_amweck88nr/pub?gid=1639594837&single=true&output=tsv',
            dataUrlSignatures: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSGocezfQekt9igT7GkM-by02hnL0ELUqtM-m3AySn1vqJ7gUdg7dJlz2nZpereA_le8_amweck88nr/pub?gid=901102443&single=true&output=tsv',
            churches: [],
            formData: {
                nome: '',
                igreja: '',
                distrito: 'VALE DO JAGUARIBE',
                whatsapp: '',
            },
            totalSignatures: 0,
            showImageModal: false,
            currentModalImage: '',
            showPhotoShareModal: false,
            capturedImage: null,
            finalShareImage: null,
            cameraStream: null,
            states: [],
            cities: [],
            showCustomAlert: false,
            customAlertMessage: '',
            formErrors: { nome: '', whatsapp: '', igreja: '' },
            isFetchingSignatures: false,
            showLoadingOverlay: false,
            showSignaturesTableModal: false,
            signaturesData: [],
            allProductCodes: [],
            productCodeToNameMap: {},
            showCustomConfirm: false,
            customConfirmMessage: '',
            confirmResolve: null
        };
    },
    watch: {
        formData: {
            handler(newValue) {
                localStorage.setItem('formData', JSON.stringify(newValue));
            },
            deep: true
        },

        'formData.distrito'(newValue) { this.formData.distrito = newValue.toUpperCase(); },
        'formData.whatsapp'(newValue) { 
            this.formData.whatsapp = this.formatTEL(newValue); 
            if (this.formErrors.whatsapp) this.formErrors.whatsapp = '';
        },
        'formData.nome'(newValue) {
            this.formData.nome = newValue.toUpperCase();
            if (this.formErrors.nome) this.formErrors.nome = '';
        },
        'formData.igreja'(newValue) {
            this.formData.igreja = newValue.toUpperCase();
            if (this.formErrors.igreja) this.formErrors.igreja = '';
        },
    },
    async mounted() {
        this.showImageModal = false; // Ensure modal is hidden on mount

        const savedFormData = localStorage.getItem('formData');
        if (savedFormData) {
            this.formData = JSON.parse(savedFormData);
        }

        this.formData.distrito = 'VALE DO JAGUARIBE';
        await this.fetchData();
        this.fetchChurchData();
        await this.fetchStates();
        await this.fetchTotalSignatures();
        if (this.formData.uf) {
            const selectedState = this.states.find(state => state.sigla === this.formData.uf);
            if (selectedState) {
                this.fetchCities(selectedState.id);
            }
        }
    },
    methods: {
        openImageModal(imageSrc) {
            this.currentModalImage = imageSrc;
            this.showImageModal = true;
        },
        closeImageModal() {
            this.showImageModal = false;
            this.currentModalImage = '';
            console.log('Closing image modal');
        },
        showAlert(message) {
            this.customAlertMessage = message;
            this.showCustomAlert = true;
        },
        closeCustomAlert() {
            this.showCustomAlert = false;
        },
        showConfirm(message) {
            this.customConfirmMessage = message;
            this.showCustomConfirm = true;
            return new Promise(resolve => {
                this.confirmResolve = resolve;
            });
        },
        confirmAction(result) {
            this.showCustomConfirm = false;
            if (this.confirmResolve) {
                this.confirmResolve(result);
                this.confirmResolve = null;
            }
        },
        validateForm() {
            this.formErrors = { nome: '', whatsapp: '', igreja: '' };
            let isValid = true;

            if (!this.formData.nome) {
                this.formErrors.nome = 'O nome é obrigatório.';
                isValid = false;
            }

            if (!this.formData.whatsapp) {
                this.formErrors.whatsapp = 'O WhatsApp é obrigatório.';
                isValid = false;
            } else if (this.formData.whatsapp.replace(/\D/g, '').length < 10) {
                this.formErrors.whatsapp = 'O número de WhatsApp parece inválido.';
                isValid = false;
            }

            if (!this.formData.igreja) {
                this.formErrors.igreja = 'A igreja é obrigatória.';
                isValid = false;
            }

            return isValid;
        },
        async openPhotoShareModal() {
            this.showPhotoShareModal = true;
            await this.startCamera();
        },
        closePhotoShareModal() {
            this.showPhotoShareModal = false;
            this.stopCamera();
            this.capturedImage = null;
            this.finalShareImage = null;
            this.fetchTotalSignatures();
        },
        async startCamera() {
            console.log('startCamera called. this.$refs.video:', this.$refs.video);
            try {
                this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                this.$refs.video.srcObject = this.cameraStream;
            } catch (err) {
                console.error('Erro ao acessar a câmera:', err);
                this.showAlert('Não foi possível acessar a câmera. Verifique as permissões.');
            }
        },
        stopCamera() {
            if (this.cameraStream) {
                this.cameraStream.getTracks().forEach(track => track.stop());
                this.cameraStream = null;
            }
        },
        capturePhoto() {
            const video = this.$refs.video;
            const canvas = this.$refs.canvas;

            if (!video || !canvas) {
                this.showAlert('Erro ao acessar câmera ou canvas.');
                return;
            }

            const context = canvas.getContext('2d');
            if (!context) {
                this.showAlert('Erro ao preparar imagem.');
                return;
            }

            canvas.width = 1080;
            canvas.height = 1920;

            // Calcular as proporções para o comportamento 'cover'
            const videoRatio = video.videoWidth / video.videoHeight;
            const canvasRatio = canvas.width / canvas.height;

            let sx, sy, sWidth, sHeight; // Source (video)

            if (videoRatio > canvasRatio) {
                // O vídeo é mais largo que o canvas, cortar as laterais do vídeo
                sHeight = video.videoHeight;
                sWidth = sHeight * canvasRatio;
                sx = (video.videoWidth - sWidth) / 2;
                sy = 0;
            } else {
                // O vídeo é mais alto que o canvas, cortar a parte superior/inferior do vídeo
                sWidth = video.videoWidth;
                sHeight = sWidth / canvasRatio;
                sx = 0;
                sy = (video.videoHeight - sHeight) / 2;
            }

            // Desenhar a parte calculada do vídeo para preencher o canvas
            context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

            this.capturedImage = canvas.toDataURL('image/png');
            this.drawAssinometroOnImage(); // atualiza finalShareImage
            this.stopCamera(); // desliga a câmera
        },
        async drawAssinometroOnImage() {
            const canvas = this.$refs.canvas;
            const context = canvas.getContext('2d');

            // 1. Cria objetos de imagem para a foto capturada e para o template.
            const capturedPhoto = new Image();
            const templateImage = new Image();

            // Lidar com o carregamento das duas imagens de forma assíncrona.
            const loadImages = Promise.all([
                new Promise(resolve => {
                    capturedPhoto.onload = resolve;
                    capturedPhoto.src = this.capturedImage; // Fonte da imagem capturada
                }),
                new Promise(resolve => {
                    templateImage.onload = resolve;
                    templateImage.src = "img/moldura.png"; // Caminho para o seu template
                })
            ]);

            // 2. Após ambas as imagens carregarem, desenha no canvas.
            loadImages.then(() => {
                // Garante que o canvas está limpo.
                context.clearRect(0, 0, canvas.width, canvas.height);

                // Passo A: Desenha a foto capturada para preencher todo o canvas.
                // A função capturePhoto() já garante que a foto cubra 1080x1920.
                context.drawImage(capturedPhoto, 0, 0, canvas.width, canvas.height);

                // Passo B: Desenha a imagem do template por cima da foto.
                // A área preta (se for transparente no seu PNG) revelará a foto abaixo.
                context.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

                const assinometroText = this.totalSignatures.toString().padStart(4, '0');
                const labelText = 'Nº ASSINATURA: ';

                // Example positions and styles - YOU WILL LIKELY NEED TO ADJUST THESE
                // These values are placeholders and need to be fine-tuned based on your actual image and desired layout.
                const centerX = canvas.width / 2 + 300;
                const centerY = canvas.height / 2 + 550;

                // Assinometro Number
                context.font = 'bold 60px Arial'; // Adjust font size and family
                context.fillStyle = '#c8860d'; // Gold color
                context.textAlign = 'center';
                context.fillText(assinometroText, centerX, centerY); // Adjust Y position

                // Assinometro Label
                context.font = 'bold 40px Arial'; // Adjust font size and family
                context.fillStyle = 'white'; // White color
                context.fillText(labelText, centerX-240, centerY-7); // Adjust Y position

                // Passo C: Define a imagem final para compartilhamento.
                this.finalShareImage = canvas.toDataURL('image/png');
            }).catch(error => {
                console.error("Erro ao carregar as imagens:", error);
                this.showAlert("Houve um problema ao carregar a imagem ou o template.");
            });
        },
        async shareImage() {
            if (this.finalShareImage) {
                try {
                    const blob = await (await fetch(this.finalShareImage)).blob();
                    const file = new File([blob], 'assinometro_mana.png', { type: 'image/png' });

                    if (navigator.share) {
                        await navigator.share({
                            title: 'Minha Porção do Maná 2025',
                            text: 'Confira minha assinatura no Assinômetro do Maná 2025!',
                            files: [file],
                        });
                        this.showAlert('Imagem compartilhada com sucesso!');
                        this.fetchTotalSignatures();
                    } else {
                        this.showAlert('Seu navegador não suporta o compartilhamento nativo. Você pode baixar a imagem e compartilhar manualmente.');
                        // Fallback for browsers that don't support Web Share API
                        const link = document.createElement('a');
                        link.href = this.finalShareImage;
                        link.download = 'assinometro_mana.png';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                    this.resetForm(); 
                } catch (error) {
                    console.error('Erro ao compartilhar imagem:', error);
                    this.showAlert('Erro ao compartilhar imagem.');
                }
            }
        },
        retakePhoto() {
            this.capturedImage = null;
            this.finalShareImage = null;
            this.startCamera();
        },
        async fetchData() {
            try {
                const urlWithCacheBuster = `${this.dataUrlProducts}&_t=${new Date().getTime()}`;
                const response = await fetch(urlWithCacheBuster);
                if (!response.ok) {
                    throw new Error(`HTTP error! code: ${response.status}`);
                }
                const dataText = await response.text();
                const lines = dataText.trim().split('\n');
                const headers = lines[0].trim().split('\t');

                const productsData = [];
                for (let i = 1; i < lines.length; i++) {
                    const currentLine = lines[i].trim();
                    if (currentLine === '') continue;

                    const values = currentLine.split('\t');
                    const product = { quantity: 0 }; // Initialize quantity to 0

                    headers.forEach((header, index) => {
                        const key = header.trim();
                        let value = values[index].trim();

                        if (key === 'price') {
                            product[key] = parseFloat(value.replace(',', '.'));
                        } else if (key === 'quantity') {
                            // If 'quantity' exists in TSV, use it, otherwise it's already 0
                            product[key] = parseInt(value, 10);
                        } else {
                            product[key] = value;
                        }
                    });
                    productsData.push(product);
                }

                // Apply saved quantities to productsData before assigning to this.products
                const savedProductQuantities = localStorage.getItem('productQuantities');
                if (savedProductQuantities) {
                    const parsedQuantities = JSON.parse(savedProductQuantities);

                    // Create a new array with updated quantities
                    const updatedProductsData = productsData.map(product => {
                        const savedItem = parsedQuantities.find(item => item.code === product.code);
                        if (savedItem) {
                            //console.log(`Updating product ${product.code} quantity from ${product.quantity} to ${savedItem.quantity}`);
                            return { ...product, quantity: savedItem.quantity };
                        }
                        return product;
                    });
                    this.products = updatedProductsData;
                    //console.log('Products after applying saved quantities:', this.products);
                } else {
                    this.products = productsData;
                    console.log('No saved product quantities found. Initial products:', this.products);
                }

            } catch (error) {
                console.error("Falha ao buscar ou processar o arquivo TSV:", error);
                this.showAlert("Não foi possível carregar os dados. Verifique o link da planilha ou a conexão com a internet.");
            }
        },
        async fetchChurchData() {
            try {
                const urlWithCacheBuster = `${this.dataUrlChurch}&_t=${new Date().getTime()}`;
                const response = await fetch(urlWithCacheBuster);
                if (!response.ok) {
                    throw new Error(`HTTP error! code: ${response.status}`);
                }
                const dataText = await response.text();
                console.log("Dados brutos da igreja (dataText):", dataText);
                const lines = dataText.trim().split('\n');
                console.log("Linhas processadas da igreja:", lines);
                this.churches = lines.slice(1).map(line => line.trim()).filter(line => line !== '');
                console.log("Igrejas carregadas (this.churches):", this.churches);
            } catch (error) {
                console.error("Falha ao buscar ou processar os dados da igreja:", error);
                this.showAlert("Não foi possível carregar os dados das igrejas. Verifique o link da planilha ou a conexão com a internet.");
            }
        },
        async fetchStates() {
            try {
                const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
                if (!response.ok) {
                    throw new Error(`HTTP error! code: ${response.status}`);
                }
                this.states = await response.json();
            } catch (error) {
                console.error("Falha ao buscar os estados:", error);
                this.showAlert("Não foi possível carregar os estados. Verifique sua conexão.");
            }
        },
        async fetchCities(stateId) {
            if (!stateId) {
                this.cities = [];
                return;
            }
            try {
                const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios?orderBy=nome`);
                if (!response.ok) {
                    throw new Error(`HTTP error! code: ${response.status}`);
                }
                this.cities = await response.json();
            } catch (error) {
                console.error("Falha ao buscar as cidades:", error);
                this.showAlert("Não foi possível carregar as cidades. Verifique sua conexão.");
            }
        },
        decreaseQuantity(code) {
            const product = this.products.find(p => p.code === code);
            if (product && product.quantity > 0) {
                product.quantity--;
                this.saveProductQuantities();
            }
        },
        increaseQuantity(code) {
            const product = this.products.find(p => p.code === code);
            if (product) {
                product.quantity++;
                this.saveProductQuantities();
            }
        },
        updateQuantity(code, event) {
            const product = this.products.find(p => p.code === code);
            if (product) {
                const value = parseInt(event.target.value) || 0;
                product.quantity = Math.max(0, value);
                this.saveProductQuantities();
            }
        },
        async submitForm() {
            if (!this.validateForm()) {
                this.showAlert('Por favor, corrija os erros no formulário antes de continuar.');
                return;
            }

            const hasProducts = this.products.some(p => p.quantity > 0);
            if (!hasProducts) {
                this.showAlert('Por favor, selecione pelo menos um produto.');
                return;
            }
            this.showLoadingOverlay = true; // Mostra o loading

            try {
                this.totalSignatures++;
                await this.sendToGoogleForm();

                // Adiciona um tempo de loading de 5 segundos
                await new Promise(resolve => setTimeout(resolve, 5000));

                this.showAlert('Formulário enviado com sucesso!'); // Mensagem de confirmação

                // Pergunta ao usuário se deseja compartilhar a conquista
                if (await this.showConfirm('Deseja tirar uma foto e compartilhar sua conquista?')) {
                    this.openPhotoShareModal(); 
                } else {
                    this.resetForm(); 
                }
            } catch (error) {
                console.error('Erro no submitForm:', error);
                // A mensagem de erro já é tratada em sendToGoogleForm
            } finally {
                this.showLoadingOverlay = false; // Esconde o loading
            }
        },
        resetForm() {
            this.products.forEach(product => {
                product.quantity = 0;
            });
            this.formData = {
                nome: '',
                igreja: '',
                distrito: 'VALE DO JAGUARIBE',
                whatsapp: ''
            };
            localStorage.removeItem('formData');
            localStorage.removeItem('productQuantities');
            this.formErrors = { nome: '', whatsapp: '', igreja: '' }; // Limpa os erros do formulário
        },
        sendToGoogleForm() {
            const baseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSc5Q5NN8K9SraLjdnu0y5QLeiIHhazrNOPARRRBgtTSZrxDDQ/formResponse'; // Endpoint de submissão
            let formData = new FormData();

            const formFields = {
                'entry.732388561': this.formData.nome, // NOME
                'entry.333865204': this.formData.igreja, // IGREJA
                'entry.529682514': this.formData.distrito, // DISTRITO
                'entry.964340878': this.formData.whatsapp, // WHATSAPP
            };

            // Adiciona os dados pessoais ao FormData
            for (const key in formFields) {
                if (formFields[key]) {
                    formData.append(key, formFields[key]);
                }
            }

            this.products.forEach(product => {
                if (product.quantity > 0) {
                    let entryId;
                    switch (product.code) {
                        case '13620': entryId = 'entry.1129472300'; break;
                        case '5771': entryId = 'entry.1022404271'; break;
                        case '13558': entryId = 'entry.1243950135'; break;
                        case '5770': entryId = 'entry.657931324'; break;
                        case '11735': entryId = 'entry.221493385'; break;
                        case '15997': entryId = 'entry.713249771'; break;
                        case '5775': entryId = 'entry.1823288868'; break;
                        case '6236': entryId = 'entry.1578335419'; break;
                        case '5773': entryId = 'entry.1964626529'; break;
                        case '5772': entryId = 'entry.639718184'; break;
                        case '5774': entryId = 'entry.2060867161'; break;
                        case '5776': entryId = 'entry.293877698'; break;
                        default: entryId = null; break;
                    }
                    if (entryId) {
                        formData.append(entryId, product.quantity);
                    }
                }
            });

            return fetch(baseUrl, {
                method: 'POST',
                body: formData,
                mode: 'no-cors' // Importante para evitar erros de CORS com o Google Forms
            })
                .then(() => {
                    console.log('Dados enviados para o Google Forms com sucesso (em segundo plano).');
                })
                .catch(error => {
                    console.error('Erro ao enviar dados para o Google Forms:', error);
                    this.showAlert('Ocorreu um erro ao enviar os dados. Por favor, tente novamente.');
                    throw error; // Rejeita a Promise para que o await em submitForm capture o erro
                });
        },
        saveProductQuantities() {
            const productQuantities = this.products.map(p => ({ code: p.code, quantity: p.quantity }));
            localStorage.setItem('productQuantities', JSON.stringify(productQuantities));
            //console.log('Saved product quantities to localStorage:', productQuantities);
        },
        
        
        formatTEL(value) {
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
        },
        async fetchTotalSignatures() {
            this.isFetchingSignatures = true; // Inicia o carregamento do botão
            this.showLoadingOverlay = true; // Mostra a sobreposição de carregamento
            try {
                const response = await fetch(this.dataUrlSignatures);
                if (!response.ok) {
                    throw new Error(`HTTP error! code: ${response.status}`);
                }
                const dataText = await response.text();
                const lines = dataText.trim().split('\n');
                const headers = lines[0].trim().split('\t');

                const tsvHeaderMapping = {
                    'Igreja': 'igreja',
                    'Distrito': 'distrito',
                    'Whatsapp': 'whatsapp',
                    'Carimbo de data/hora': 'timestamp',
                };

                // Populate tsvHeaderMapping with product entryIds
                this.products.forEach(p => {
                    let entryId;
                    switch (p.code) {
                        case '13620': entryId = 'entry.1129472300'; break;
                        case '5771': entryId = 'entry.1022404271'; break;
                        case '13558': entryId = 'entry.1243950135'; break;
                        case '5770': entryId = 'entry.657931324'; break;
                        case '11735': entryId = 'entry.221493385'; break;
                        case '15997': entryId = 'entry.713249771'; break;
                        case '5775': entryId = 'entry.1823288868'; break;
                        case '6236': entryId = 'entry.1578335419'; break;
                        case '5773': entryId = 'entry.1964626529'; break;
                        case '5772': entryId = 'entry.639718184'; break;
                        case '5774': entryId = 'entry.2060867161'; break;
                        case '5776': entryId = 'entry.293877698'; break;
                        default: entryId = null; break;
                    }
                    if (entryId) {
                        tsvHeaderMapping[p.code] = entryId;
                    }
                });

                let totalSum = 0;
                for (let i = 1; i < lines.length; i++) {
                    const currentLine = lines[i].trim();
                    if (currentLine === '') continue;

                    const values = currentLine.split('\t');
                    const currentSignatureData = {};

                    headers.forEach((header, index) => {
                        const tsvHeader = header.trim();
                        const value = values[index] ? values[index].trim() : '';
                        const mappedKey = tsvHeaderMapping[tsvHeader];

                        if (mappedKey) {
                            currentSignatureData[mappedKey] = value;
                        }
                    });

                    // Sum quantities for all products in the current signature
                    for (const tsvHeader in tsvHeaderMapping) {
                        const mappedKey = tsvHeaderMapping[tsvHeader];
                        if (mappedKey.startsWith('entry.')) { // It's a product
                            const quantity = parseInt(currentSignatureData[mappedKey], 10) || 0;
                            totalSum += quantity;
                        }
                    }
                }
                this.totalSignatures = totalSum;
            } catch (error) {
                console.error("Falha ao buscar o total de assinaturas:", error);
                this.totalSignatures = 0;
            } finally {
                this.isFetchingSignatures = false; // Finaliza o carregamento do botão
                this.showLoadingOverlay = false; // Esconde a sobreposição de carregamento
            }
        },
        openSignaturesTableModal: async function() {
            this.showLoadingOverlay = true;
            try {
                const response = await fetch(this.dataUrlSignatures);
                if (!response.ok) {
                    throw new Error(`HTTP error! code: ${response.status}`);
                }
                const dataText = await response.text();
                const lines = dataText.trim().split('\n');
                const headers = lines[0].trim().split('\t');

                console.log('Headers:', headers);
                console.log('Lines:', lines);
                console.log('Data Text:', dataText);

                // Mapear códigos de entrada para nomes de produtos
                this.productCodeToNameMap = {};
                const tsvHeaderMapping = {
                    'Igreja': 'igreja',
                    'Distrito': 'distrito',
                    'Whatsapp': 'whatsapp',
                    'Carimbo de data/hora': 'timestamp',
                };

                this.products.forEach(p => {
                    let entryId;
                    switch (p.code) {
                        case '13620': entryId = 'entry.1129472300'; break;
                        case '5771': entryId = 'entry.1022404271'; break;
                        case '13558': entryId = 'entry.1243950135'; break;
                        case '5770': entryId = 'entry.657931324'; break;
                        case '11735': entryId = 'entry.221493385'; break;
                        case '15997': entryId = 'entry.713249771'; break;
                        case '5775': entryId = 'entry.1823288868'; break;
                        case '6236': entryId = 'entry.1578335419'; break;
                        case '5773': entryId = 'entry.1964626529'; break;
                        case '5772': entryId = 'entry.639718184'; break;
                        case '5774': entryId = 'entry.2060867161'; break;
                        case '5776': entryId = 'entry.293877698'; break;
                        default: entryId = null; break;
                    }
                    if (entryId) {
                        tsvHeaderMapping[p.code] = entryId; // Map TSV product code to entryId
                        this.productCodeToNameMap[entryId] = p.name;
                    }
                });

                const aggregatedSignatures = {};
                this.allProductCodes = []; // Para coletar todos os códigos de produtos presentes

                // Popula allProductCodes com todos os entryIds de produtos conhecidos
                for (const productCode in tsvHeaderMapping) {
                    const mappedKey = tsvHeaderMapping[productCode];
                    if (mappedKey && mappedKey.startsWith('entry.') && !this.allProductCodes.includes(mappedKey)) {
                        this.allProductCodes.push(mappedKey);
                    }
                }

                for (let i = 1; i < lines.length; i++) {
                    const currentLine = lines[i].trim();
                    if (currentLine === '') continue;

                    const values = currentLine.split('\t');
                    const currentSignatureData = {}; // Use a temporary object to store parsed data for the current signature

                    headers.forEach((header, index) => {
                        const tsvHeader = header.trim();
                        const value = values[index] ? values[index].trim() : '';
                        const mappedKey = tsvHeaderMapping[tsvHeader];

                        if (mappedKey) {
                            currentSignatureData[mappedKey] = value;
                        }
                    });

                    const igreja = currentSignatureData.igreja;
                    if (igreja) {
                        if (!aggregatedSignatures[igreja]) {
                            aggregatedSignatures[igreja] = {
                                igreja: igreja,
                                distrito: currentSignatureData.distrito || '',
                                products: {},
                                total: 0
                            };
                        }

                        for (const entryId of this.allProductCodes) {
                            const quantity = parseInt(currentSignatureData[entryId], 10) || 0;
                            if (quantity > 0) {
                                aggregatedSignatures[igreja].products[entryId] = (aggregatedSignatures[igreja].products[entryId] || 0) + quantity;
                                aggregatedSignatures[igreja].total += quantity;
                            }
                        }
                    }
                }
                this.signaturesData = Object.values(aggregatedSignatures);
                this.showSignaturesTableModal = true;
            } catch (error) {
                console.error("Falha ao buscar ou processar os dados das assinaturas:", error);
                this.showAlert("Não foi possível carregar os dados das assinaturas. Verifique o link da planilha ou a conexão com a internet.");
            } finally {
                this.showLoadingOverlay = false;
            }
        },
        closeSignaturesTableModal: function() {
            this.showSignaturesTableModal = false;
            this.signaturesData = [];
            this.allProductCodes = [];
            this.productCodeToNameMap = {};
        }
    }
}).mount('#app');