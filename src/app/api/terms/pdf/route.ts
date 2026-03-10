import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

export async function GET() {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Set margins
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - 2 * margin;
    let yPos = margin;

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize: number, color: string | number[], isBold = false, isUnderline = false) => {
      doc.setFontSize(fontSize);
      if (Array.isArray(color)) {
        doc.setTextColor(color[0], color[1], color[2]);
      } else {
        doc.setTextColor(color);
      }
      if (isBold) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
      }
      
      const lines = doc.splitTextToSize(text, maxWidth);
      
      // Check if we need a new page
      if (yPos + (lines.length * fontSize * 0.4) > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
      
      lines.forEach((line: string) => {
        if (isUnderline) {
          const textWidth = doc.getTextWidth(line);
          doc.text(line, margin, yPos);
          doc.setLineWidth(0.5);
          doc.line(margin, yPos + 1, margin + textWidth, yPos + 1);
        } else {
          doc.text(line, margin, yPos);
        }
        yPos += fontSize * 0.4;
      });
      
      yPos += 2; // Add spacing after text
    };

    // Title
    addText("Service Agreement & Terms", 20, [74, 35, 90], true);
    yPos += 5;

    // Subtitle
    addText("GRWTEE (Get Ready With Tee)", 14, [13, 115, 119], false);
    yPos += 8;

    // Section 1
    addText("1. Scope of Services", 12, [91, 44, 111], true, true);
    addText("GRWTEE provides virtual and physical styling services as agreed in the service request or proposal.", 10, [0, 0, 0]);
    yPos += 3;

    // Section 2
    addText("2. Deliverables", 12, [91, 44, 111], true, true);
    addText("Deliverables include lookbooks, mood boards, and styling recommendations as specified per service.", 10, [0, 0, 0]);
    yPos += 3;

    // Section 3
    addText("3. Timelines", 12, [91, 44, 111], true, true);
    addText("3.1 Lookbook Delivery: 6–10 working days after booking.", 10, [0, 0, 0]);
    addText("3.2 Express Styling: 1–3 working days (20% surcharge).", 10, [0, 0, 0]);
    yPos += 3;

    // Section 4
    addText("4. Terms of Payment", 12, [91, 44, 111], true, true);
    addText("100% upfront payment is required before commencement of any service.", 10, [0, 0, 0]);
    yPos += 3;

    // Section 5
    addText("5. Revision Policy", 12, [91, 44, 111], true, true);
    addText("A maximum of 3 rounds of revisions per booking.", 10, [0, 0, 0]);
    yPos += 3;

    // Section 6
    addText("6. Shopping & Purchase Policy", 12, [91, 44, 111], true, true);
    addText("Purchase recommended items within 24 hours of receiving your lookbook to avoid sellouts.", 10, [0, 0, 0]);
    yPos += 3;

    // Section 7
    addText("7. Physical Styling Services", 12, [91, 44, 111], true, true);
    addText("Client bears travel, feeding, and accommodation costs upfront alongside styling fee.", 10, [0, 0, 0]);
    yPos += 3;

    // Section 8
    addText("8. Intellectual Property", 12, [91, 44, 111], true, true);
    addText("All lookbooks, mood boards, and styling concepts remain property of GRWTEE unless otherwise agreed.", 10, [0, 0, 0]);
    yPos += 3;

    // Section 9
    addText("9. Confidentiality", 12, [91, 44, 111], true, true);
    addText("We maintain confidentiality for client information and materials.", 10, [0, 0, 0]);
    yPos += 3;

    // Section 10
    addText("10. Communication & Availability", 12, [91, 44, 111], true, true);
    addText("Delays from late responses may extend timelines. Availability outside scheduled sessions is not guaranteed.", 10, [0, 0, 0]);
    yPos += 3;

    // Section 11
    addText("11. Additional Services", 12, [91, 44, 111], true, true);
    addText("Requests outside the agreed scope incur additional charges.", 10, [0, 0, 0]);
    yPos += 5;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    doc.setFont("helvetica", "normal");
    
    const footerY = pageHeight - margin;
    doc.text(`Last Updated: ${new Date().toLocaleDateString()}`, margin, footerY - 10);
    doc.text("Contact for Questions: book@grwtee.com", margin, footerY - 6);
    doc.text(`Website: ${process.env.NEXT_PUBLIC_SITE_URL || "https://grwtee.com"}`, margin, footerY - 2);

    // Generate PDF buffer
    const pdfOutput = doc.output("arraybuffer");
    const pdfBuffer = Buffer.from(pdfOutput);

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="grwtee-terms-and-conditions.pdf"',
        "Content-Length": pdfBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate PDF", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
