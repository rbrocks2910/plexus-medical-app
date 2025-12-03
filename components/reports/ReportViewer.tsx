/**
 * @file ReportViewer.tsx
 * @description This component is a modal designed to display detailed clinical investigation reports.
 * It's a critical part of the UI, translating the structured data from the Gemini API into a
 * professional, readable format for the user.
 *
 * Core Features:
 * - **Dynamic Rendering:** It uses the `getInvestigationType` utility to determine if a report is
 *   for a lab, imaging, or exam, and renders the content differently for each type.
 * - **Lab Report Formatting:** It includes a sophisticated `LabReportTable` sub-component that parses
 *   markdown-formatted tables from the AI's response and renders them as proper HTML tables. This is
 *   key to displaying lab results clearly. It also handles a "Pathologist's Comment" section.
 * - **Imaging Report Formatting:** For imaging tests, it displays the generated image (`report.imageUrl`)
 *   alongside the textual interpretation in a two-column layout.
 * - **Reusable and Self-contained:** It's a modal that takes all necessary data (`report`, `patient`) as props
 *   and handles its own visibility and closing logic via the `onClose` callback.
 */

import React from 'react';
import { InvestigationResult, MedicalCase } from '../../types';
import { getInvestigationType, InvestigationType } from '../../constants';
import { Card } from '../ui/Card';
import { LabIcon, ImagingIcon, ExamIcon } from '../icons/ReportIcons';

interface ReportViewerProps {
  report: InvestigationResult;
  patient: MedicalCase['patient'];
  onClose: () => void;
}

/**
 * A helper component specifically designed to parse and render markdown tables for lab reports.
 * The Gemini API is prompted to return lab results in this format for clarity and structure.
 * This component ensures that the text is displayed in a clean, professional table rather than as raw text.
 * @param {string} content - The string content, expected to be a markdown table.
 */
const LabReportTable: React.FC<{ content: string }> = ({ content }) => {
  try {
    // Attempt to parse the markdown table structure.
    const lines = content.trim().split('\n').filter(line => line.includes('|'));
    if (lines.length < 3) throw new Error("Not a valid markdown table."); // A valid table needs headers, a separator, and at least one row.

    const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
    const rows = lines.slice(2).map(line => 
      line.split('|').map(cell => cell.replace(/`/g, '').trim()).filter(Boolean) // Remove backticks used for monospace formatting.
    ).filter(row => row.length > 0 && row.length === headers.length);

    if (headers.length === 0 || rows.length === 0) {
        throw new Error("No headers or rows found in table.");
    }
    
    // Render the parsed data into an HTML table.
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                  <tr>
                      {headers.map((header, i) => (
                          <th key={i} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{header}</th>
                      ))}
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                  {rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="even:bg-slate-50/50">
                          {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-4 py-2 whitespace-nowrap text-sm text-slate-700 font-mono">{cell}</td>
                          ))}
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    );
  } catch (error) {
    // If parsing fails for any reason (e.g., AI returns a slightly malformed table),
    // fall back gracefully to displaying the raw text in a preformatted block. This prevents the UI from crashing.
    return <pre className="whitespace-pre-wrap font-mono text-sm bg-slate-50 p-4 rounded-md">{content}</pre>;
  }
};


export const ReportViewer: React.FC<ReportViewerProps> = ({ report, patient, onClose }) => {
  // Determine the report type to decide on the icon and layout.
  const type = getInvestigationType(report.testName);

  const icons: Record<InvestigationType, React.ReactNode> = {
    lab: <LabIcon className="h-6 w-6 text-blue-500" />,
    imaging: <ImagingIcon className="h-6 w-6 text-purple-500" />,
    exam: <ExamIcon className="h-6 w-6 text-green-500" />,
  };
  
  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // This function contains the core logic for rendering the report body based on its type.
  const renderContent = () => {
    const interpretationText = report.interpretation || 'No interpretation provided.';
    
    // Logic for Lab Reports: Parse out the pathologist's comment and render the rest as a table.
    if (type === 'lab') {
        const pathologistCommentRegex = /Pathologist's Comment:(.*)/s;
        const commentMatch = interpretationText.match(pathologistCommentRegex);
        const tableContent = interpretationText.split("Pathologist's Comment:")[0];
        const pathologistComment = commentMatch ? commentMatch[1].trim() : '';
        return (
          <div className="space-y-4">
            <LabReportTable content={tableContent} />
            {pathologistComment && (
              <div>
                <h4 className="font-semibold text-slate-700 text-sm">Pathologist's Comment</h4>
                <div className="text-slate-600 mt-1 p-3 bg-slate-50 border border-slate-200 rounded-md text-sm">{pathologistComment}</div>
              </div>
            )}
          </div>
        );
    }
    
    // Logic for Imaging Reports: Display the image and interpretation side-by-side on larger screens.
    if (type === 'imaging') {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:order-2">
              <h3 className="text-lg font-semibold text-slate-800">Interpretation</h3>
              <div className="mt-2 text-slate-600 prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">{report.interpretation}</div>
            </div>
            <div className="md:order-1">
              {report.imageUrl ? (
                <img src={report.imageUrl} alt={report.testName} className="rounded-lg shadow-md w-full object-contain border border-slate-200" />
              ) : (
                <div className="w-full h-64 bg-slate-100 border border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                    <p className="text-slate-500">Image not available</p>
                </div>
              )}
            </div>
          </div>
        );
    }

    // Default/Exam Logic: Display the interpretation as plain text.
    return <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{report.interpretation}</p>
  };


  return (
    // The modal backdrop. Clicking it will call the `onClose` function.
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in"
        onClick={onClose}
        role="dialog" aria-modal="true"
    >
      <Card 
        className="w-full max-w-4xl max-h-[90vh] flex flex-col relative !p-0" 
        onClick={(e) => e.stopPropagation()} // Prevents clicks inside the card from propagating to the backdrop and closing the modal.
      >
        {/* A dedicated close button for accessibility and clear user affordance. */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 z-10 bg-white/50 hover:bg-white transition-colors"
          aria-label="Close report view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Report Header: Contains the test name, date, and patient info for context. This section is not scrollable. */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 bg-slate-100 p-3 rounded-full">{icons[type]}</div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{report.testName}</h2>
                <p className="text-sm text-slate-500">Report Date: {reportDate}</p>
              </div>
            </div>
            <div className="text-right text-sm flex-shrink-0 ml-4">
              <p className="font-semibold text-slate-700">{patient.name}</p>
              <p className="text-slate-500">Age: {patient.age}, Gender: {patient.gender}</p>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-md font-semibold text-slate-700">Summary Findings</h3>
            <p className="text-slate-600 italic mt-1">{report.result}</p>
          </div>
        </div>
        
        {/* Report Body: The main content area, which is scrollable (`overflow-y-auto`) and dynamically rendered based on the report type. */}
        <div className="p-6 overflow-y-auto flex-grow bg-slate-50/50">
          {renderContent()}
        </div>
      </Card>
    </div>
  );
};