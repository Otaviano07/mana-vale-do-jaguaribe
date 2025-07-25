Vue.createApp({
    data() {
        return {
            paymentMethod: 'cartao',
            products: [],
            dataUrlProducts: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSGocezfQekt9igT7GkM-by02hnL0ELUqtM-m3AySn1vqJ7gUdg7dJlz2nZpereA_le8_amweck88nr/pub?gid=0&single=true&output=tsv',
            dataUrlChurch: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSGocezfQekt9igT7GkM-by02hnL0ELUqtM-m3AySn1vqJ7gUdg7dJlz2nZpereA_le8_amweck88nr/pub?gid=1639594837&single=true&output=tsv',
            dataUrlSignatures: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSGocezfQekt9igT7GkM-by02hnL0ELUqtM-m3AySn1vqJ7gUdg7dJlz2nZpereA_le8_amweck88nr/pub?gid=901102443&single=true&output=tsv',
            churches: [],
            formData: {
                nome: '',
                cpf: '',
                igreja: '',
                distrito: 'VALE DO JAGUARIBE',
                endereco: '',
                numero: '',
                complemento: '',
                bairro: '',
                cep: '',
                cidade: '',
                cp: '',
                uf: '',
                fone1: '',
                fone2: '',
                email: ''
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
            streets: []
        };
    },
    watch: {
        formData: {
            handler(newValue) {
                localStorage.setItem('formData', JSON.stringify(newValue));
            },
            deep: true
        },

        'formData.nome'(newValue) { this.formData.nome = newValue.toUpperCase(); },
        'formData.igreja'(newValue) { this.formData.igreja = newValue.toUpperCase(); },
        'formData.distrito'(newValue) { this.formData.distrito = newValue.toUpperCase(); },
        'formData.endereco'(newValue) { this.formData.endereco = newValue.toUpperCase(); },
        'formData.complemento'(newValue) { this.formData.complemento = newValue.toUpperCase(); },
        'formData.bairro'(newValue) { this.formData.bairro = newValue.toUpperCase(); },
        'formData.cidade': function (newValue, oldValue) {
            this.formData.cidade = newValue.toUpperCase();
            if (newValue !== oldValue) {
                this.formData.cep = '';
                this.formData.cp = '';
                this.formData.endereco = '';
                this.formData.numero = '';
                this.formData.complemento = '';
                this.formData.bairro = '';
            }
        },
        'formData.uf': function (newValue, oldValue) {
            this.formData.uf = newValue.toUpperCase();
            if (newValue !== oldValue) {
                this.formData.cidade = '';
                this.formData.cep = '';
                this.formData.cp = '';
                this.formData.endereco = '';
                this.formData.numero = '';
                this.formData.complemento = '';
                this.formData.bairro = '';
                this.cities = [];
                if (newValue) {
                    const selectedState = this.states.find(state => state.sigla === newValue);
                    if (selectedState) {
                        this.fetchCities(selectedState.id);
                    }
                }
            }
        },
        'formData.email'(newValue) { this.formData.email = newValue.toLowerCase(); },
        'formData.cpf'(newValue) {
            let value = String(newValue || '').replace(/\D/g, ''); // Garante que é string e remove não-dígitos
            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            if (value.length > 9) {
                value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
            } else if (value.length > 6) {
                value = value.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3');
            } else if (value.length > 3) {
                value = value.replace(/^(\d{3})(\d{3})$/, '$1.$2');
            }
            this.formData.cpf = value;
        },
        'formData.cep'(newValue) {
            let value = String(newValue || '').replace(/\D/g, ''); // Garante que é string e remove não-dígitos
            if (value.length > 8) {
                value = value.substring(0, 8);
            }
            if (value.length > 5) {
                value = value.replace(/^(\d{5})(\d{3})$/, '$1-$2');
            }
            this.formData.cep = value;
        }
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
        async openPhotoShareModal() {
            this.showPhotoShareModal = true;
            await this.startCamera();
        },
        closePhotoShareModal() {
            this.showPhotoShareModal = false;
            this.stopCamera();
            this.capturedImage = null;
            this.finalShareImage = null;
            this.resetForm(); // Reseta o formulário após fechar o modal de compartilhamento
        },
        async startCamera() {
            try {
                this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                this.$refs.video.srcObject = this.cameraStream;
            } catch (err) {
                console.error('Erro ao acessar a câmera:', err);
                alert('Não foi possível acessar a câmera. Verifique as permissões.');
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
                alert('Erro ao acessar câmera ou canvas.');
                return;
            }

            const context = canvas.getContext('2d');
            if (!context) {
                alert('Erro ao preparar imagem.');
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
        async drawAssinometroOnImagem() {
            const canvas = this.$refs.canvas;
            const context = canvas.getContext('2d');
            const img = new Image();
            img.src = this.capturedImage;

            img.onload = () => {
                // Redraw the captured image
                context.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Assinometro text properties (adjust as needed for your design)
                const assinometroText = this.totalSignatures.toString().padStart(4, '0');
                const labelText = 'ASSINATURAS';
                const motivationalText = 'Cada assinatura é uma alma alcançada com a Palavra!';

                // Example positions and styles - YOU WILL LIKELY NEED TO ADJUST THESE
                // These values are placeholders and need to be fine-tuned based on your actual image and desired layout.
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                // Assinometro Number
                context.font = 'bold 60px Arial'; // Adjust font size and family
                context.fillStyle = '#c8860d'; // Gold color
                context.textAlign = 'center';
                context.fillText(assinometroText, centerX, centerY - 30); // Adjust Y position

                // Assinometro Label
                context.font = 'bold 24px Arial'; // Adjust font size and family
                context.fillStyle = 'white'; // White color
                context.fillText(labelText, centerX, centerY + 10); // Adjust Y position

                // Motivational Text
                context.font = 'italic 18px Arial'; // Adjust font size and family
                context.fillStyle = '#c8860d'; // Gold color
                context.fillText(motivationalText, centerX, centerY + 50); // Adjust Y position

                this.finalShareImage = canvas.toDataURL('image/png');
            };
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
                    templateImage.src = "img/fundo.png"; // Caminho para o seu template
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
                const labelText = 'Nº ASSINATURAS: ';

                // Example positions and styles - YOU WILL LIKELY NEED TO ADJUST THESE
                // These values are placeholders and need to be fine-tuned based on your actual image and desired layout.
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                // Assinometro Number
                context.font = 'bold 60px Arial'; // Adjust font size and family
                context.fillStyle = '#c8860d'; // Gold color
                context.textAlign = 'center';
                context.fillText(assinometroText, centerX, centerY - 30); // Adjust Y position

                // Assinometro Label
                context.font = 'bold 24px Arial'; // Adjust font size and family
                context.fillStyle = 'white'; // White color
                context.fillText(labelText, centerX, centerY + 10); // Adjust Y position

                // Passo C: Define a imagem final para compartilhamento.
                this.finalShareImage = canvas.toDataURL('image/png');
            }).catch(error => {
                console.error("Erro ao carregar as imagens:", error);
                alert("Houve um problema ao carregar a imagem ou o template.");
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
                        alert('Imagem compartilhada com sucesso!');
                    } else {
                        alert('Seu navegador não suporta o compartilhamento nativo. Você pode baixar a imagem e compartilhar manualmente.');
                        // Fallback for browsers that don't support Web Share API
                        const link = document.createElement('a');
                        link.href = this.finalShareImage;
                        link.download = 'assinometro_mana.png';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                } catch (error) {
                    console.error('Erro ao compartilhar imagem:', error);
                    alert('Erro ao compartilhar imagem.');
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
                console.log('Loaded productQuantities from localStorage:', savedProductQuantities);
                if (savedProductQuantities) {
                    const parsedQuantities = JSON.parse(savedProductQuantities);
                    console.log('Parsed productQuantities:', parsedQuantities);

                    // Create a new array with updated quantities
                    const updatedProductsData = productsData.map(product => {
                        const savedItem = parsedQuantities.find(item => item.code === product.code);
                        if (savedItem) {
                            console.log(`Updating product ${product.code} quantity from ${product.quantity} to ${savedItem.quantity}`);
                            return { ...product, quantity: savedItem.quantity };
                        }
                        return product;
                    });
                    this.products = updatedProductsData;
                    console.log('Products after applying saved quantities:', this.products);
                } else {
                    this.products = productsData;
                    console.log('No saved product quantities found. Initial products:', this.products);
                }

            } catch (error) {
                console.error("Falha ao buscar ou processar o arquivo TSV:", error);
                alert("Não foi possível carregar os dados. Verifique o link da planilha ou a conexão com a internet.");
            }
        },
        async fetchChurchData() {
            try {
                const response = await fetch(this.dataUrlChurch);
                if (!response.ok) {
                    throw new Error(`HTTP error! code: ${response.status}`);
                }
                const dataText = await response.text();
                const lines = dataText.trim().split('\n');
                this.churches = lines.slice(1).map(line => line.trim()).filter(line => line !== '');
            } catch (error) {
                console.error("Falha ao buscar ou processar os dados da igreja:", error);
                alert("Não foi possível carregar os dados das igrejas. Verifique o link da planilha ou a conexão com a internet.");
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
                alert("Não foi possível carregar os estados. Verifique sua conexão.");
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
                alert("Não foi possível carregar as cidades. Verifique sua conexão.");
            }
        },
        async fetchAddressFromCEP() {
            const cepRaw = this.formData.cep;

            if (!cepRaw) return;

            const cep = String(cepRaw || '').replace(/\D/g, '');
            if (cep.length === 8) {
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();

                    if (!data.erro) {
                        this.formData.endereco = data.logradouro?.toUpperCase() || '';
                        this.formData.bairro = data.bairro?.toUpperCase() || '';
                        this.formData.cidade = data.localidade?.toUpperCase() || '';
                        this.formData.uf = data.uf?.toUpperCase() || '';
                    } else {
                        alert('CEP não encontrado.');
                    }
                } catch (error) {
                    console.error('Erro ao buscar CEP:', error);
                    alert('Erro ao buscar endereço.');
                }
            }
        }
        ,
        async searchAddress() {
            if (!this.formData.uf || !this.formData.cidade || this.formData.endereco.length <= 2) {
                this.streets = [];
                return;
            }

            try {
                const response = await fetch(`https://viacep.com.br/ws/${this.formData.uf}/${this.formData.cidade}/${this.formData.endereco}/json/`);
                const data = await response.json();

                if (data && data.length > 0) {
                    this.streets = data;
                } else {
                    this.streets = [];
                }
            } catch (error) {
                console.error('Erro ao buscar endereço:', error);
                alert('Não foi possível buscar o endereço. Verifique sua conexão.');
            }
        },
        handleAddressBlur(event) {
            const selectedStreet = this.streets.find(street => street.logradouro.toUpperCase() === event.target.value.toUpperCase());
            if (selectedStreet) {
                this.formData.cep = selectedStreet.cep;
                this.formData.bairro = selectedStreet.bairro;
            }
            this.streets = []; // Limpa a lista de sugestões
        },
        increaseQuantity(code) {
            const product = this.products.find(p => p.code === code);
            if (product) {
                product.quantity++;
                this.saveProductQuantities();
            }
        },
        decreaseQuantity(code) {
            const product = this.products.find(p => p.code === code);
            if (product && product.quantity > 0) {
                product.quantity--;
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
        calculateTotal() {
            return this.products.reduce((total, product) => {
                return total + (product.price * product.quantity);
            }, 0);
        },
        submitForm() {
            const hasProducts = this.products.some(p => p.quantity > 0);
            if (!hasProducts) {
                alert('Por favor, selecione pelo menos um produto.');
                return;
            }
            if (!this.formData.nome || !this.formData.cpf || !this.formData.email) {
                alert('Por favor, preencha os campos obrigatórios: Nome, CPF e E-mail.');
                return;
            }
            this.generatePDF();
            this.totalSignatures++;
            this.sendToGoogleForm();

            // Pergunta ao usuário se deseja compartilhar a conquista
            if (confirm('Assinatura finalizada! Deseja tirar uma foto e compartilhar sua conquista?')) {
                this.openPhotoShareModal();
            } else {
                this.resetForm(); // Reseta o formulário apenas se não for compartilhar
            }
        },
        generatePDF() {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = "img/fundo.jpg";

            img.onload = () => {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();

                // Adiciona o fundo
                doc.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight);

                // Exemplo de preenchimento dos campos (ajuste as coordenadas conforme necessidade)
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);

                // NOME
                let nome = this.formData.nome.toUpperCase();
                for (let i = 0; i < nome.length; i++) {
                    doc.text(nome[i], 27 + i * 4.2, 33);
                }

                // CPF
                let cpf = this.formData.cpf.replace(/\D/g, '');
                for (let i = 0; i < cpf.length; i++) {
                    doc.text(cpf[i], 27 + i * 4.2, 41);
                }

                // IGREJA
                let igreja = this.formData.igreja.toUpperCase();
                for (let i = 0; i < igreja.length; i++) {
                    doc.text(igreja[i], 102 + i * 4.2, 41);
                }

                // Exemplo adicional: DISTRITO
                let distrito = this.formData.distrito?.toUpperCase() || "";
                for (let i = 0; i < distrito.length; i++) {
                    doc.text(distrito[i], 27 + i * 4.2, 49);
                }

                // Após preencher tudo:
                doc.save(`formulario_mana_2025_${this.formData.nome.replace(/\s+/g, '_')}.pdf`);
            };
        },
        formatTextForPDF(text, maxLength) {
            if (!text) return '';
            const chars = text.toString().substring(0, maxLength).split('');
            return chars.join(' ');
        },
        getPaymentMethodLabel() {
            const methods = {
                'cartao': 'Cartão de Crédito',
                'boleto': 'Boleto',
                'pix': 'Dinheiro ou Pix'
            };
            return methods[this.paymentMethod] || 'Não selecionado';
        },
        resetForm() {
            this.products.forEach(product => {
                product.quantity = 0;
            });
            this.formData = {
                nome: '',
                cpf: '',
                igreja: '',
                distrito: 'VALE DO JAGUARIBE',
                endereco: '',
                numero: '',
                complemento: '',
                bairro: '',
                cep: '',
                cidade: '',
                cp: '',
                uf: '',
                fone1: '',
                fone2: '',
                email: ''
            };
            this.paymentMethod = 'cartao';
            localStorage.removeItem('formData');
            localStorage.removeItem('productQuantities');
        },
        sendToGoogleForm() {
            const baseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSc5Q5NN8K9SraLjdnu0y5QLeiIHhazrNOPARRRBgtTSZrxDDQ/formResponse'; // Endpoint de submissão
            let formData = new FormData();

            const formFields = {
                'entry.732388561': this.formData.nome, // NOME
                'entry.1574716751': this.formData.cpf, // CPF
                'entry.333865204': this.formData.igreja, // IGREJA
                'entry.529682514': this.formData.distrito, // DISTRITO
                'entry.1781233763': this.formData.endereco, // ENDERECO
                'entry.1736056879': this.formData.numero, // NUMERO
                'entry.50479641': this.formData.complemento, // COMPLEMENTO
                'entry.1929953233': this.formData.bairro, // BAIRRO
                'entry.1486174441': this.formData.cidade, // CIDADE
                'entry.123373047': this.formData.cep, // CEP
                'entry.1269423802': this.formData.cp, // CODIGO (assuming cp is codigo postal)
                'entry.1533328364': this.formData.uf, // UF
                'entry.1725718185': this.formData.fone1, // FONE1
                'entry.964340878': this.formData.fone2, // FONE2
                'entry.365082788': this.formData.email, // EMAIL
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
                        case '13620': entryId = 'entry.1129472300'; break; // LICAO13620
                        case '5771': entryId = 'entry.1022404271'; break;  // LICAO5771
                        case '13558': entryId = 'entry.1243950135'; break; // LICAO13558
                        case '5750': entryId = 'entry.657931324'; break;  // LICAO5750
                        case '11735': entryId = 'entry.221493385'; break;  // LICAO11735
                        case '15997': entryId = 'entry.713249771'; break; // LICAO15997
                        case '5775': entryId = 'entry.1823288868'; break; // LICAO5775
                        case '6236': entryId = 'entry.1578335419'; break; // LICAO6236
                        case '5773': entryId = 'entry.1964626529'; break; // LICAO5773
                        case '639718184': entryId = 'entry.639718184'; break; // LICAO5772 (assuming this is the correct entry for 5772)
                        case '5774': entryId = 'entry.2060867161'; break; // LICAO5774
                        case '5776': entryId = 'entry.293877698'; break; // LICAO5776
                        default: entryId = null; break;
                    }
                    if (entryId) {
                        formData.append(entryId, product.quantity);
                    }
                }
            });

            fetch(baseUrl, {
                method: 'POST',
                body: formData,
                mode: 'no-cors' // Importante para evitar erros de CORS com o Google Forms
            })
                .then(() => {
                    console.log('Dados enviados para o Google Forms com sucesso (em segundo plano).');
                })
                .catch(error => {
                    console.error('Erro ao enviar dados para o Google Forms:', error);
                    alert('Ocorreu um erro ao enviar os dados. Por favor, tente novamente.');
                });
        },
        saveProductQuantities() {
            const productQuantities = this.products.map(p => ({ code: p.code, quantity: p.quantity }));
            localStorage.setItem('productQuantities', JSON.stringify(productQuantities));
            console.log('Saved product quantities to localStorage:', productQuantities);
        },
        
        
        formatTEL(value) {
            value = value.replace(/\D/g, '');

            if (value.length > 11) {
                value = value.substring(0, 11);
            }

            if (value.length > 10) {
                value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
            } else if (value.length > 6) {
                value = value.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/^(\d{2})(\d*)$/, '($1) $2');
            } else {
                value = value.replace(/^(\d*)$/, '($1');
            }
            return value;
        },
        async fetchTotalSignatures() {
            try {
                const response = await fetch(this.dataUrlSignatures);
                if (!response.ok) {
                    throw new Error(`HTTP error! code: ${response.status}`);
                }
                const dataText = await response.text();
                const lines = dataText.trim().split('\n');
                this.totalSignatures = lines.length > 1 ? lines.length - 1 : 0;
            } catch (error) {
                console.error("Falha ao buscar o total de assinaturas:", error);
                this.totalSignatures = 0;
            }
        },
    }
}).mount('#app');


document.addEventListener('DOMContentLoaded', async () => {
    const app = document.getElementById('app').__vue_app__;
    if (app) {
        // A função fetchTotalSignatures agora é um método do componente Vue
        // e será chamada dentro do mounted() do próprio componente.
        // Não é mais necessário chamá-la aqui.
    }
});