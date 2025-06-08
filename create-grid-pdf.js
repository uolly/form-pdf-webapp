const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

async function createGridPDF() {
    try {
        const pdfPath = path.join(__dirname, 'templates', 'iscrizione.pdf');
        const existingPdfBytes = await fs.readFile(pdfPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        
        console.log(`Dimensioni PDF: ${width} x ${height}`);
        
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        // Disegna griglia ogni 50 pixel
        for (let x = 0; x <= width; x += 50) {
            firstPage.drawLine({
                start: { x: x, y: 0 },
                end: { x: x, y: height },
                thickness: 0.5,
                color: rgb(0.9, 0.9, 0.9)
            });
            
            firstPage.drawText(x.toString(), {
                x: x + 2,
                y: height - 15,
                size: 8,
                font: helveticaFont,
                color: rgb(1, 0, 0)
            });
        }
        
        for (let y = 0; y <= height; y += 50) {
            firstPage.drawLine({
                start: { x: 0, y: y },
                end: { x: width, y: y },
                thickness: 0.5,
                color: rgb(0.9, 0.9, 0.9)
            });
            
            firstPage.drawText(y.toString(), {
                x: 5,
                y: y + 2,
                size: 8,
                font: helveticaFont,
                color: rgb(0, 0, 1)
            });
        }
        
        const pdfBytes = await pdfDoc.save();
        await fs.writeFile('templates/modulo_con_griglia.pdf', pdfBytes);
        
        console.log('PDF con griglia salvato in: templates/modulo_con_griglia.pdf');
        console.log('Apri questo PDF per vedere le coordinate X,Y dove inserire i campi');
        
    } catch (error) {
        console.error('Errore:', error);
    }
}

createGridPDF();