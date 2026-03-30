
"use client";

import type * as React from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Criterion, GradeLevel, SelectedGrades } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonsProps {
  criteria: Criterion[]; // Now dynamic
  gradeLevels: GradeLevel[]; 
  selectedGrades: SelectedGrades;
  studentNames: string[]; 
  teacherNames: string[];
  projectName: string;
  studyLevel: string;
  studySubLevel: string;
  session: string;
  academicYear: string;
  universityName: string;
  establishmentName: string;
  departmentName: string;
  masterSpecialty: string;
  universityLogo: string | null;
  totalPoints: number;
  maxTotalPoints: number; // This will be TARGET_SUM_COEFFICIENTS (e.g. 20)
  evaluationSheetTitleComplement: string;
}

const NON_NOTE_VALUE = "__NONE__"; 
const BASE_DOCUMENT_TITLE_PREFIX = "Fiche d'évaluation des travaux de l'atelier";

export function ExportButtons({
  criteria, // Now dynamic
  selectedGrades,
  studentNames, 
  teacherNames,
  projectName,
  studyLevel,
  studySubLevel,
  session,
  academicYear,
  universityName,
  establishmentName,
  departmentName,
  masterSpecialty,
  universityLogo,
  totalPoints,
  maxTotalPoints, // This is the target sum, e.g., 20
  evaluationSheetTitleComplement,
}: ExportButtonsProps) {
  const { toast } = useToast();

  const getPointsForSelectedGrade = (selectedGradeStr: string | undefined): number => {
    if (!selectedGradeStr || selectedGradeStr === NON_NOTE_VALUE) return 0;
    const points = parseFloat(selectedGradeStr);
    return isNaN(points) ? 0 : points;
  };

  const generateFileNameBase = () => {
    const primaryStudentName = (studentNames[0] || 'etudiant').replace(/\s+/g, '_');
    return studentNames.length > 1 ? `${primaryStudentName}_et_autres` : primaryStudentName;
  };
  
  const getDocumentTitle = () => {
    return `${BASE_DOCUMENT_TITLE_PREFIX} ${evaluationSheetTitleComplement || '...............................................................'}`;
  }

  const handleExportCSV = () => {
    const documentTitle = getDocumentTitle();
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `${documentTitle}\n`;
    if (universityLogo) {
      csvContent += "Logo Université:,(Logo fourni)\n";
    }
    csvContent += `Université:,"${universityName || 'N/A'}"\n`;
    csvContent += `Établissement:,"${establishmentName || 'N/A'}"\n`;
    csvContent += `Département:,"${departmentName || 'N/A'}"\n`;
    csvContent += `Niveau d'étude:,"${studyLevel ? `${studyLevel} - ${studySubLevel}` : 'N/A'}"\n`;
    if (studyLevel === "Master") {
      csvContent += `Spécialité Master:,"${masterSpecialty || 'N/A'}"\n`;
    }
    const studentNamesString = studentNames.filter(name => name.trim() !== "").join(", ") || "N/A";
    csvContent += `Nom de l'étudiant(e/s):,"${studentNamesString}"\n`;
    const teacherNamesString = teacherNames.filter(name => name.trim() !== "").join(", ") || "N/A";
    csvContent += `Nom de l'enseignant(e/s):,"${teacherNamesString}"\n`;
    csvContent += `Intitulé du Projet:,"${projectName || 'N/A'}"\n`;
    csvContent += `Session:,"${session || 'N/A'}"\n`;
    csvContent += `Année Universitaire:,"${academicYear || 'N/A'}"\n\n`;
    
    csvContent += "Critère,Coefficient,Note Attribuée,Points Obtenus\n";

    criteria.forEach(criterion => {
      const selectedGradeStr = selectedGrades[criterion.id];
      const displayGrade = (selectedGradeStr && selectedGradeStr !== NON_NOTE_VALUE && criterion.coefficient > 0) ? selectedGradeStr : "N/A";
      const points = criterion.coefficient > 0 ? getPointsForSelectedGrade(selectedGradeStr) : 0;
      csvContent += `"${criterion.name}",${criterion.coefficient},${displayGrade},${points.toFixed(2)}\n`;
    });

    csvContent += `\nTotal des Points,""," ",${totalPoints.toFixed(2)}\n`;
    csvContent += `Sur,""," ",${maxTotalPoints.toFixed(2)}\n`; // maxTotalPoints is now the target sum (e.g., 20)

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `evaluation_${generateFileNameBase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Succès", description: "Fichier CSV exporté." });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const documentTitle = getDocumentTitle();
    let yPos = 15; 
    const lineHeight = 6;
    const pageMargin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    if (universityLogo) {
      try {
        const img = new window.Image();
        img.src = universityLogo;
        
        const imageTypeMatch = universityLogo.match(/^data:image\/(png|jpe?g|svg\+xml);base64,/);
        let imageType = 'PNG'; 
        if (imageTypeMatch && imageTypeMatch[1]) {
            if (imageTypeMatch[1] === 'jpeg' || imageTypeMatch[1] === 'jpg') imageType = 'JPEG';
            else if (imageTypeMatch[1] === 'svg+xml') imageType = 'SVG'; 
            else imageType = imageTypeMatch[1].toUpperCase();
        }

        const logoWidth = 25; 
        const logoHeight = (img.height * logoWidth) / img.width; 
        
        doc.addImage(universityLogo, imageType, pageWidth - pageMargin - logoWidth, yPos, logoWidth, logoHeight);
        yPos += logoHeight + 5; 
      } catch (e) {
        console.error("Error adding logo to PDF:", e);
        toast({ variant: "destructive", title: "Erreur Logo", description: "Impossible d'ajouter le logo au PDF." });
      }
    }

    doc.setFontSize(18);
    const titleLines = doc.splitTextToSize(documentTitle, pageWidth - (pageMargin*2) - (universityLogo ? 30 : 0)); // Adjust width for logo
    doc.text(titleLines, pageMargin, yPos);
    yPos += lineHeight * titleLines.length + (titleLines.length > 1 ? 2 : 4);
    
    doc.setFontSize(11);
    doc.text(`Université: ${universityName || 'N/A'}`, pageMargin, yPos); yPos += lineHeight;
    doc.text(`Établissement: ${establishmentName || 'N/A'}`, pageMargin, yPos); yPos += lineHeight;
    doc.text(`Département: ${departmentName || 'N/A'}`, pageMargin, yPos); yPos += lineHeight;
    doc.text(`Niveau d'étude: ${studyLevel ? `${studyLevel} - ${studySubLevel}`: 'N/A'}`, pageMargin, yPos); yPos += lineHeight;
    if (studyLevel === "Master") {
      doc.text(`Spécialité Master: ${masterSpecialty || 'N/A'}`, pageMargin, yPos); yPos += lineHeight;
    }
    
    const studentNamesString = studentNames.filter(name => name.trim() !== "").join(", ") || "N/A";
    doc.text(`Nom de l'étudiant(e/s): ${studentNamesString}`, pageMargin, yPos); yPos += lineHeight;
    const teacherNamesString = teacherNames.filter(name => name.trim() !== "").join(", ") || "N/A";
    doc.text(`Nom de l'enseignant(e/s): ${teacherNamesString}`, pageMargin, yPos); yPos += lineHeight;
    doc.text(`Intitulé du Projet: ${projectName || 'N/A'}`, pageMargin, yPos); yPos += lineHeight;
    doc.text(`Session: ${session || 'N/A'}`, pageMargin, yPos); yPos += lineHeight;
    doc.text(`Année Universitaire: ${academicYear || 'N/A'}`, pageMargin, yPos); yPos += lineHeight;
    
    const tableColumn = ["Critère d'Évaluation", "Coeff.", "Note Attribuée", "Points Obtenus"];
    const tableRows: (string | number)[][] = [];

    criteria.forEach(criterion => {
      const selectedGradeStr = selectedGrades[criterion.id];
      const displayGrade = (selectedGradeStr && selectedGradeStr !== NON_NOTE_VALUE && criterion.coefficient > 0) ? selectedGradeStr : "N/A";
      const points = criterion.coefficient > 0 ? getPointsForSelectedGrade(selectedGradeStr) : 0;
      const criterionRow = [
        `${criterion.name}${criterion.details ? '\\n(' + criterion.details.replace(/\n/g, '\\n') + ')' : ''}`, // Escape newlines in details
        criterion.coefficient,
        displayGrade,
        points.toFixed(2),
      ];
      tableRows.push(criterionRow);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yPos + 2, 
      theme: 'grid',
      styles: { halign: 'left', fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [30, 130, 100], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' }, 
        1: { cellWidth: 15, halign: 'center' },  
        2: { cellWidth: 35, halign: 'center' },  
        3: { cellWidth: 30, halign: 'center' },  
      },
      didParseCell: (data) => {
        if (data.column.index === 0 && typeof data.cell.raw === 'string' && data.cell.raw.includes('\\n')) {
          data.cell.styles.valign = 'middle';
        }
      }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50; 
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Note Finale: ${totalPoints.toFixed(2)} / ${maxTotalPoints.toFixed(2)}`, pageMargin, finalY + 10); // maxTotalPoints is target sum

    doc.save(`evaluation_${generateFileNameBase()}.pdf`);
    toast({ title: "Succès", description: "Fichier PDF exporté." });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Button onClick={handleExportCSV} variant="outline" className="w-full sm:w-auto">
        <Download className="mr-2 h-4 w-4" />
        Exporter en CSV
      </Button>
      <Button onClick={handleExportPDF} variant="outline" className="w-full sm:w-auto">
        <FileText className="mr-2 h-4 w-4" />
        Exporter en PDF
      </Button>
    </div>
  );
}

    