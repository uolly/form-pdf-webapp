const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

async function analyzePDF() {
    try {
        const pdfPath = path.join(__dirname, 'templates', 'iscrizione.pdf');
        const pdfBytes = await fs.readFile(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        console.log('=== Analisi PDF ===');
        console.log('Numero di pagine:', pdfDoc.getPageCount());
        
        // Verifica se ha un form
        try {
            const form = pdfDoc.getForm();
            const fields = form.getFields();
            
            console.log('\n✓ Il PDF ha campi form!');
            console.log('Numero di campi:', fields.length);
            
            console.log('\nElenco campi trovati:');
            fields.forEach((field, index) => {
                const name = field.getName();
                const type = field.constructor.name;
                console.log(`${index + 1}. Nome: "${name}" - Tipo: ${type}`);
            });
            
        } catch (error) {
            console.log('\n✗ Il PDF NON ha campi form compilabili');
            console.log('Dovremo usare il metodo di scrittura diretta del testo');
        }
        
        // Mostra dimensioni della prima pagina
        const firstPage = pdfDoc.getPages()[0];
        const { width, height } = firstPage.getSize();
        console.log('\nDimensioni prima pagina:', width, 'x', height);
        
    } catch (error) {
        console.error('Errore:', error.message);
    }
}

analyzePDF();