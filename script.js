

Vue.createApp({
    data() {
        return {
            paymentMethod: 'cartao',
            products: [],
            dataUrlProducts: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSGocezfQekt9igT7GkM-by02hnL0ELUqtM-m3AySn1vqJ7gUdg7dJlz2nZpereA_le8_amweck88nr/pub?gid=0&single=true&output=tsv',
            dataUrlChurch: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSGocezfQekt9igT7GkM-by02hnL0ELUqtM-m3AySn1vqJ7gUdg7dJlz2nZpereA_le8_amweck88nr/pub?gid=1639594837&single=true&output=tsv',
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
            totalSignatures: 0
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
        'formData.cidade'(newValue) { this.formData.cidade = newValue.toUpperCase(); },
        'formData.uf'(newValue) { this.formData.uf = newValue.toUpperCase(); },
        'formData.email'(newValue) { this.formData.email = newValue.toLowerCase(); }
    },
    mounted() {
        VMasker(document.querySelector('#cpf')).maskPattern('999.999.999-99');
        VMasker(document.querySelector('#cep')).maskPattern('99999-999');
        VMasker(document.querySelector('#fone1')).maskPattern('(99) 99999-9999');
        VMasker(document.querySelector('#fone2')).maskPattern('(99) 99999-9999');

        const savedFormData = localStorage.getItem('formData');
        if (savedFormData) {
            this.formData = JSON.parse(savedFormData);
        }
        
        this.formData.distrito = 'VALE DO JAGUARIBE';
        this.fetchData();
        this.fetchChurchData();
    },
    methods: {
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
                    const product = {};

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
                this.products = productsData;

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
        async fetchAddressFromCEP() {
            const cep = this.formData.cep.replace(/\D/g, '');
            if (cep.length === 8) {
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();
                    if (!data.erro) {
                        this.formData.endereco = data.logradouro.toUpperCase();
                        this.formData.bairro = data.bairro.toUpperCase();
                        this.formData.cidade = data.localidade.toUpperCase();
                        this.formData.uf = data.uf.toUpperCase();
                    } else {
                        alert('CEP não encontrado.');
                    }
                } catch (error) {
                    console.error('Erro ao buscar CEP:', error);
                    alert('Não foi possível buscar o CEP. Verifique sua conexão.');
                }
            }
        },
        increaseQuantity(code) {
            const product = this.products.find(p => p.code === code);
            if (product) {
                product.quantity++;
            }
        },
        decreaseQuantity(code) {
            const product = this.products.find(p => p.code === code);
            if (product && product.quantity > 0) {
                product.quantity--;
            }
        },
        updateQuantity(code, event) {
            const product = this.products.find(p => p.code === code);
            if (product) {
                const value = parseInt(event.target.value) || 0;
                product.quantity = Math.max(0, value);
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
            this.resetForm();
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
        },
        sendToGoogleForm() {
            const baseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSc5Q5NN8K9SraLjdnu0y5QLeiIHhazrNOPARRRBgtTSZrxDDQ/viewform?usp=pp_url';
            let formUrl = baseUrl;

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

            // Add product quantities to form fields
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
                        formFields[entryId] = product.quantity;
                    }
                }
            });

            for (const key in formFields) {
                if (formFields[key]) {
                    formUrl += `&${key}=${encodeURIComponent(formFields[key])}`;
                }
            }
            window.open(formUrl, '_blank');
        }
    }
}).mount('#app');