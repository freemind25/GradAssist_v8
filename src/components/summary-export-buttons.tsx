
"use client";

import type * as React from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { EvaluationData } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface SummaryExportButtonsProps {
  allEvaluations: EvaluationData[];
  maxTotalPoints: number;
  moduleName: string;
}

export function SummaryExportButtons({
  allEvaluations,
  maxTotalPoints,
  moduleName
}: SummaryExportButtonsProps) {
  const { toast } = useToast();

  const generateFileNameBase = () => {
    const date = new Date();
    return `synthese_evaluations_${moduleName.replace(/\s/g, '_')}_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleExportSummaryCSV = () => {
    if (allEvaluations.length === 0) {
      toast({ variant: "destructive", title: "Aucune Donnée", description: "Aucune évaluation à exporter dans la synthèse." });
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    const firstEval = allEvaluations[0];
    csvContent += `Synthèse des Évaluations - ${moduleName}\n`;
    if (firstEval.evaluationSheetTitleComplement && firstEval.evaluationSheetTitleComplement !== "...............................................................") {
      csvContent += `Contexte:,"${firstEval.evaluationSheetTitleComplement}"\n`;
    }
    csvContent += `Université:,"${firstEval.universityName || 'N/A'}"\n`;
    csvContent += `Établissement:,"${firstEval.establishmentName || 'N/A'}"\n`;
    csvContent += `Département:,"${firstEval.departmentName || 'N/A'}"\n\n`;
    
    csvContent += "N°,Nom de l'étudiant(e/s),Nom de l'enseignant(e/s),Intitulé du Projet,Niveau d'étude,Spécialité Master,Session,Année Universitaire,Note Finale,Sur\n";

    allEvaluations.forEach((evaluation, index) => {
      const studentNamesString = evaluation.studentNames.filter(name => name.trim() !== "").join(" & ") || "N/A";
      const teacherNamesString = evaluation.teacherNames.filter(name => name.trim() !== "").join(" & ") || "N/A";
      const studyLevelString = evaluation.studyLevel ? `${evaluation.studyLevel} - ${evaluation.studySubLevel}` : 'N/A';
      csvContent += `${index + 1},"${studentNamesString}","${teacherNamesString}","${evaluation.projectName || 'N/A'}","${studyLevelString}","${evaluation.masterSpecialty || 'N/A'}","${evaluation.session || 'N/A'}","${evaluation.academicYear || 'N/A'}",${evaluation.totalPoints.toFixed(2)},${maxTotalPoints.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${generateFileNameBase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Succès", description: "Synthèse CSV exportée." });
  };

  const handleExportSummaryPDF = () => {
    if (allEvaluations.length === 0) {
      toast({ variant: "destructive", title: "Aucune Donnée", description: "Aucune évaluation à exporter dans la synthèse." });
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    let yPos = 15;
    const lineHeight = 7;
    const pageMargin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();

    const firstEval = allEvaluations[0];
    if (firstEval.universityLogo) {
      try {
        const img = new window.Image();
        img.src = firstEval.universityLogo;
        const imageTypeMatch = firstEval.universityLogo.match(/^data:image\/(png|jpe?g|svg\+xml);base64,/);
        let imageType = 'PNG';
        if (imageTypeMatch && imageTypeMatch[1]) {
            if (imageTypeMatch[1] === 'jpeg' || imageTypeMatch[1] === 'jpg') imageType = 'JPEG';
            else if (imageTypeMatch[1] === 'svg+xml') imageType = 'SVG';
            else imageType = imageTypeMatch[1].toUpperCase();
        }
        const logoWidth = 20; 
        const logoHeight = (img.height * logoWidth) / img.width;
        doc.addImage(firstEval.universityLogo, imageType, pageWidth - pageMargin - logoWidth, yPos, logoWidth, logoHeight);
        yPos = Math.max(yPos, yPos + logoHeight - 10); 
      } catch (e) { console.error("Error adding logo to summary PDF:", e); }
    }
    
    doc.setFontSize(16);
    doc.text(`Synthèse des Évaluations - ${moduleName}`, pageMargin, yPos); yPos += lineHeight * 1.5;
    
    doc.setFontSize(10);
     if (firstEval.evaluationSheetTitleComplement && firstEval.evaluationSheetTitleComplement !== "...............................................................") {
      doc.text(`Contexte: ${firstEval.evaluationSheetTitleComplement}`, pageMargin, yPos); yPos += lineHeight * 0.8;
    }
    doc.text(`Université: ${firstEval.universityName || 'N/A'}`, pageMargin, yPos); yPos += lineHeight * 0.8;
    doc.text(`Établissement: ${firstEval.establishmentName || 'N/A'}`, pageMargin, yPos); yPos += lineHeight * 0.8;
    doc.text(`Département: ${firstEval.departmentName || 'N/A'}`, pageMargin, yPos); yPos += lineHeight * 1.2;

    const tableColumn = ["N°", "Étudiant(e/s)", "Enseignant(e/s)", "Projet", "Niveau", "Spécialité", "Sess.", "Année Univ.", "Note (/"+maxTotalPoints.toFixed(2)+")"];
    const tableRows: (string | number)[][] = [];

    allEvaluations.forEach((evaluation, index) => {
      const studentNamesString = evaluation.studentNames.filter(name => name.trim() !== "").join(" & ") || "N/A";
      const teacherNamesString = evaluation.teacherNames.filter(name => name.trim() !== "").join(" & ") || "N/A";
      const studyLevelString = evaluation.studyLevel ? `${evaluation.studyLevel} - ${evaluation.studySubLevel}` : 'N/A';
      const rowData = [
        index + 1,
        studentNamesString,
        teacherNamesString,
        evaluation.projectName || "N/A",
        studyLevelString,
        evaluation.masterSpecialty || "N/A",
        evaluation.session || "N/A",
        evaluation.academicYear || "N/A",
        evaluation.totalPoints.toFixed(2),
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yPos,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 }, 
      headStyles: { fillColor: [30, 130, 100], textColor: 255, fontStyle: 'bold', halign: 'center' }, 
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' }, 
        1: { cellWidth: 40, halign: 'left' }, 
        2: { cellWidth: 40, halign: 'left' }, 
        3: { cellWidth: 'auto', halign: 'left' }, 
        4: { cellWidth: 18, halign: 'center' }, 
        5: { cellWidth: 20, halign: 'left' }, 
        6: { cellWidth: 10, halign: 'center' }, 
        7: { cellWidth: 16, halign: 'center' }, 
        8: { cellWidth: 15, halign: 'center', fontStyle: 'bold'}, 
      },
    });

    doc.save(`${generateFileNameBase()}.pdf`);
    toast({ title: "Succès", description: "Synthèse PDF exportée." });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Button onClick={handleExportSummaryCSV} variant="secondary" className="w-full sm:w-auto">
        <Download className="mr-2 h-4 w-4" />
        Exporter Synthèse (CSV)
      </Button>
      <Button onClick={handleExportSummaryPDF} variant="secondary" className="w-full sm:w-auto">
        <FileText className="mr-2 h-4 w-4" />
        Exporter Synthèse (PDF)
      </Button>
    </div>
  );
}

    