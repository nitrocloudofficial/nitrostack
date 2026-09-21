import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Factory } from "@/lib/types"

type AutoTableDocument = jsPDF & {
  lastAutoTable?: {
    finalY?: number
  }
}

function getLastTableY(doc: jsPDF, fallback: number): number {
  return (doc as AutoTableDocument).lastAutoTable?.finalY ?? fallback
}

export function buildFormVPDFDocument(factory: Factory): jsPDF {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("FORM V", 105, 15, { align: "center" })
    
    doc.setFontSize(12)
    doc.text("(See Rule 14)", 105, 22, { align: "center" })
    doc.text("Environmental Statement for the financial year ending 31st March", 105, 29, { align: "center" })

    // Section A
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("PART A", 14, 45)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`1. Name and address of the owner/occupier of the industry:`, 14, 55)
    doc.text(`   ${factory.name}`, 14, 62)
    doc.text(`   ${factory.location.address}`, 14, 69)

    doc.text(`2. Industry Category: ${factory.industryType}`, 14, 79)
    doc.text(`3. Production Capacity: ${factory.productionCapacity}`, 14, 86)
    
    const year = new Date().getFullYear()
    doc.text(`4. Year of establishment: ${year - 5}`, 14, 93) // Mock data

    // Section B
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("PART B", 14, 110)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("Water and Raw Material Consumption", 14, 118)

    // Raw Materials Table
    const rawMaterialsData = factory.rawMaterials.map(rm => [rm, "100 MT", "95 MT"])
    
    autoTable(doc, {
      startY: 125,
      head: [['Raw Material', 'Consumption during previous year', 'Consumption during current year']],
      body: rawMaterialsData.length ? rawMaterialsData : [['N/A', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] }
    })

    // Section C
    const finalY = getLastTableY(doc, 135)
    
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("PART C", 14, finalY + 15)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("Pollution discharged to environment / unit of output", 14, finalY + 23)

    // Wastes Table
    const wastesData = (factory.declaredWastes || []).map(w => [w, "Within Limits", "No deviation"])
    
    autoTable(doc, {
      startY: finalY + 30,
      head: [['Pollutants', 'Quantity of Pollutants discharged (mass/day)', 'Percentage of variation from standards']],
      body: wastesData.length ? wastesData : [['None declared', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] }
    })

    // Footer signature
    const sigY = getLastTableY(doc, finalY + 30) + 30
    if (sigY > 260) {
      doc.addPage()
      doc.text("Signature of the Occupier: ____________________", 130, 30)
    doc.text("Name: Admin User", 130, 40)
    doc.text("Designation: Plant Head", 130, 50)
    } else {
      doc.text("Signature of the Occupier: ____________________", 130, sigY)
      doc.text("Name: Admin User", 130, sigY + 10)
      doc.text("Designation: Plant Head", 130, sigY + 20)
    }

    return doc
}

export function formVPDFFileName(factory: Factory): string {
  const year = new Date().getFullYear()
  const safeName = factory.name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "")
  return `Form_V_${safeName || factory.id}_${year}.pdf`
}

export async function generateFormVPDF(factory: Factory): Promise<boolean> {
  try {
    const doc = buildFormVPDFDocument(factory)
    doc.save(formVPDFFileName(factory))
    return true
  } catch (error) {
    console.error("PDF Generation failed", error)
    throw error
  }
}
