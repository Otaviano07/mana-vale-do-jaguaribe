Vue.createApp({
    data() {
        return {
            products: [],
            searchQuery: '',
            dataUrlProducts: '/api/produtos',
            dataUrlChurch: '/api/igrejas',
            dataUrlSignatures: '/api/assinaturas',
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
    computed: {
        filteredProducts() {
            if (!this.searchQuery) {
                return this.products;
            }
            const lowerCaseQuery = this.searchQuery.toLowerCase();
            return this.products.filter(product => {
                return product.name.toLowerCase().includes(lowerCaseQuery) || 
                       product.age.toLowerCase().includes(lowerCaseQuery);
            });
        }
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
        this.showImageModal = false;

        const savedFormData = localStorage.getItem('formData');
        if (savedFormData) {
            this.formData = JSON.parse(savedFormData);
        }

        this.formData.distrito = 'VALE DO JAGUARIBE';
        await this.fetchData();
        this.fetchChurchData();
        await this.fetchTotalSignatures();
    },
    methods: {
        openImageModal(imageSrc) {
            this.currentModalImage = imageSrc;
            this.showImageModal = true;
        },
        closeImageModal() {
            this.showImageModal = false;
            this.currentModalImage = '';
            
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
            const errors = [];

            if (!this.formData.nome) {
                this.formErrors.nome = 'O nome é obrigatório.';
                errors.push('Nome');
            }

            if (!this.formData.whatsapp) {
                this.formErrors.whatsapp = 'O WhatsApp é obrigatório.';
                errors.push('Whatsapp');
            } else if (this.formData.whatsapp.replace(/\D/g, '').length < 10) {
                this.formErrors.whatsapp = 'O número de WhatsApp parece inválido.';
                errors.push('Whatsapp inválido');
            }

            if (!this.formData.igreja) {
                this.formErrors.igreja = 'A igreja é obrigatória.';
                errors.push('Igreja');
            }

            return errors;
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
            
            try {
                this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                this.$refs.video.srcObject = this.cameraStream;
            } catch (err) {
                
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

            const videoRatio = video.videoWidth / video.videoHeight;
            const canvasRatio = canvas.width / canvas.height;

            let sx, sy, sWidth, sHeight;

            if (videoRatio > canvasRatio) {
                sHeight = video.videoHeight;
                sWidth = sHeight * canvasRatio;
                sx = (video.videoWidth - sWidth) / 2;
                sy = 0;
            } else {
                sWidth = video.videoWidth;
                sHeight = sWidth / canvasRatio;
                sx = 0;
                sy = (video.videoHeight - sHeight) / 2;
            }

            context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

            this.capturedImage = canvas.toDataURL('image/png');
            this.drawAssinometroOnImage();
            this.stopCamera();
        },
        async drawAssinometroOnImage() {
            const canvas = this.$refs.canvas;
            const context = canvas.getContext('2d');

            const capturedPhoto = new Image();
            const templateImage = new Image();

            const loadImages = Promise.all([
                new Promise(resolve => {
                    capturedPhoto.onload = resolve;
                    capturedPhoto.src = this.capturedImage;
                }),
                new Promise(resolve => {
                    templateImage.onload = resolve;
                    templateImage.src = "img/moldura.png";
                })
            ]);

            loadImages.then(() => {
                context.clearRect(0, 0, canvas.width, canvas.height);

                context.drawImage(capturedPhoto, 0, 0, canvas.width, canvas.height);

                context.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

                const assinometroText = this.totalSignatures.toString().padStart(4, '0');
                const labelText = 'Nº ASSINATURA: ';

                const centerX = canvas.width / 2 + 300;
                const centerY = canvas.height / 2 + 550;

                context.font = 'bold 60px Arial';
                context.fillStyle = '#c8860d';
                context.textAlign = 'center';
                context.fillText(assinometroText, centerX, centerY);

                context.font = 'bold 40px Arial';
                context.fillStyle = 'white';
                context.fillText(labelText, centerX-240, centerY-7);

                this.finalShareImage = canvas.toDataURL('image/png');
            }).catch(error => {
                
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
                        const link = document.createElement('a');
                        link.href = this.finalShareImage;
                        link.download = 'assinometro_mana.png';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                    this.resetForm(); 
                } catch (error) {
                    
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
                const response = await fetch(this.dataUrlProducts);
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
                    const product = { quantity: 0 };

                    headers.forEach((header, index) => {
                        const key = header.trim();
                        let value = values[index].trim();

                        if (key === 'price') {
                            product[key] = parseFloat(value.replace(',', '.'));
                        } else if (key === 'quantity') {
                            product[key] = parseInt(value, 10);
                        } else {
                            product[key] = value;
                        }
                    });
                    productsData.push(product);
                }

                const savedProductQuantities = localStorage.getItem('productQuantities');
                if (savedProductQuantities) {
                    const parsedQuantities = JSON.parse(savedProductQuantities);

                    const updatedProductsData = productsData.map(product => {
                        const savedItem = parsedQuantities.find(item => item.code === product.code);
                        if (savedItem) {
                            return { ...product, quantity: savedItem.quantity };
                        }
                        return product;
                    });
                    this.products = updatedProductsData;
                } else {
                    this.products = productsData;
                    
                }

            } catch (error) {
                
                this.showAlert("Não foi possível carregar os dados. Verifique o link da planilha ou a conexão com a internet.");
            }
        },
        async fetchChurchData() {
            try {
                const response = await fetch(this.dataUrlChurch);
                if (!response.ok) {
                    throw new Error(`HTTP error! code: ${response.status}`);
                }
                const dataText = await response.text();                const lines = dataText.trim().split('\n');
                this.churches = lines.slice(1).map(line => line.trim()).filter(line => line !== '');
            } catch (error) {
                console.error("Falha ao buscar ou processar os dados da igreja:", error);
                this.showAlert("Não foi possível carregar os dados das igrejas. Verifique o link da planilha ou a conexão com a internet.");
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
            const validationErrors = this.validateForm();
            if (validationErrors.length > 0) {
                const errorList = validationErrors.join(', ');
                this.showAlert(`Por favor, preencha os seguintes campos obrigatórios: ${errorList}.`);
                return;
            }

            const hasProducts = this.products.some(p => p.quantity > 0);
            if (!hasProducts) {
                this.showAlert('Por favor, selecione pelo menos um produto.');
                return;
            }
            this.showLoadingOverlay = true;
            console.log('submitForm: Iniciando submissão do formulário.');

            try {
                console.log('submitForm: Chamando sendToGoogleForm().');
                await this.sendToGoogleForm();
                console.log('submitForm: sendToGoogleForm() concluído.');

                console.log('submitForm: Aguardando 2 segundos...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log('submitForm: Atraso de 2 segundos finalizado.');
                
                this.showAlert('Formulário enviado com sucesso!');
                this.showLoadingOverlay = false;
                console.log('submitForm: Perguntando sobre compartilhamento.');
                if (await this.showConfirm('Deseja tirar uma foto e compartilhar sua conquista?')) {
                    this.totalSignatures++;
                    this.openPhotoShareModal(); 
                    console.log('submitForm: Abrindo modal de compartilhamento de foto.');
                } else {
                    this.resetForm(); 
                    console.log('submitForm: Resetando formulário.');
                }
            } catch (error) {
                console.error('submitForm: Erro durante a submissão:', error);
                this.showAlert('Ocorreu um erro ao enviar os dados. Por favor, tente novamente.');
            } finally {
                this.showLoadingOverlay = false;
                console.log('submitForm: Loading overlay definido como false no bloco finally.');
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
            this.formErrors = { nome: '', whatsapp: '', igreja: '' };
        },
        sendToGoogleForm() {
            console.log('sendToGoogleForm: Preparando para enviar dados.');
            const baseUrl = '/api/enviar';
            let formData = new FormData();

            const formFields = {
                'entry.732388561': this.formData.nome,
                'entry.333865204': this.formData.igreja,
                'entry.529682514': this.formData.distrito,
                'entry.964340878': this.formData.whatsapp,
            };

            console.log('sendToGoogleForm: Campos do formulário a serem enviados:', formFields);

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
                        console.log(`sendToGoogleForm: Adicionando produto ${product.name} (Cód. ${product.code}) com quantidade ${product.quantity} para ${entryId}`);
                    }
                }
            });

            console.log('sendToGoogleForm: Enviando requisição para:', baseUrl);
            return fetch(baseUrl, {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    console.log('sendToGoogleForm: Resposta do servidor recebida.', response);
                    if (!response.ok) {
                        console.error('sendToGoogleForm: Erro na resposta do servidor:', response.status, response.statusText);
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response;
                })
                .catch(error => {
                    console.error('sendToGoogleForm: Erro ao enviar dados para o Google Forms:', error);
                    this.showAlert('Ocorreu um erro ao enviar os dados. Por favor, tente novamente.');
                    throw error;
                });
        },
        saveProductQuantities() {
            const productQuantities = this.products.map(p => ({ code: p.code, quantity: p.quantity }));
            localStorage.setItem('productQuantities', JSON.stringify(productQuantities));
        },
        
        
        formatTEL(value) {
            let cleaned = ('' + value).replace(/\D/g, '');

            cleaned = cleaned.substring(0, 11);

            const parts = [];

            if (cleaned.length > 0) {
                parts.push('(' + cleaned.substring(0, 2));
            }

            if (cleaned.length > 2) {
                const middleGroupSize = cleaned.length > 10 ? 5 : 4;
                parts.push(') ' + cleaned.substring(2, 2 + middleGroupSize));
            }

            if (cleaned.length > 6) {
                const middleGroupSize = cleaned.length > 10 ? 5 : 4;
                const startOfLastGroup = 2 + middleGroupSize;
                
                if (cleaned.substring(startOfLastGroup)) {
                   parts.push('-' + cleaned.substring(startOfLastGroup, startOfLastGroup + 4));
                }
            }

            return parts.join('');
        },
        async fetchTotalSignatures() {
            this.isFetchingSignatures = true;
            this.showLoadingOverlay = true;
            try {
                const response = await fetch(this.dataUrlSignatures);
                if (!response.ok) {
                    throw new Error(`HTTP error! code: ${response.status}`);
                }
                const dataText = await response.text();
                const lines = dataText.trim().split('\n');
                const headers = lines[0].trim().split('\t');

                this.productCodeToNameMap = {};
                this.allProductCodes = [];
                const productCodeToEntryIdMap = {};

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
                        this.productCodeToNameMap[entryId] = p.name;
                        this.allProductCodes.push(entryId);
                        productCodeToEntryIdMap[p.code] = entryId;
                    }
                });

                const aggregatedSignatures = {};
                let totalSum = 0;

                for (let i = 1; i < lines.length; i++) {
                    const currentLine = lines[i].trim();
                    if (currentLine === '') continue;

                    const values = currentLine.split('\t');
                    const currentSignatureData = {};

                    headers.forEach((header, index) => {
                        const tsvHeader = header.trim();
                        const value = values[index] ? values[index].trim() : '';

                        if (tsvHeader === 'Igreja') {
                            currentSignatureData.igreja = value;
                        } else if (tsvHeader === 'Distrito') {
                            currentSignatureData.distrito = value;
                        } else if (tsvHeader === 'Whatsapp') {
                            currentSignatureData.whatsapp = value;
                        } else if (tsvHeader === 'Carimbo de data/hora') {
                            currentSignatureData.timestamp = value;
                        } else if (productCodeToEntryIdMap[tsvHeader]) {
                            const entryId = productCodeToEntryIdMap[tsvHeader];
                            currentSignatureData[entryId] = value;
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
                                totalSum += quantity;
                            }
                        }
                    }
                }
                this.totalSignatures = totalSum;
                this.signaturesData = Object.values(aggregatedSignatures);
            } catch (error) {
                
                this.totalSignatures = 0;
            } finally {
                this.isFetchingSignatures = false;
                this.showLoadingOverlay = false;
            }
        },
        openSignaturesTableModal: async function() {
            this.showLoadingOverlay = true;
            try {
                await this.fetchTotalSignatures();
                this.showSignaturesTableModal = true;
            } catch (error) {
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