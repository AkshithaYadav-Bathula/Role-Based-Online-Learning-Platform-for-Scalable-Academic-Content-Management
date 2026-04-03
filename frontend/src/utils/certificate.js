import { jsPDF } from 'jspdf';

const loadImageAsDataUrl = (url) =>
  new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext('2d');

        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (_error) {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = url;
  });

export const downloadCourseCertificate = async ({
  courseTitle,
  studentName,
  educatorName,
  completionPercentage,
  logoUrl,
  brandName = 'EDEMY',
  issuerName,
  leftSignatureUrl = '/signatures/left-signature.png',
  rightSignatureUrl = '/signatures/right-signature.png',
}) => {
  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  document.setFillColor(246, 250, 255);
  document.rect(0, 0, pageWidth, pageHeight, 'F');

  document.setDrawColor(20, 40, 90);
  document.setLineWidth(3);
  document.rect(26, 26, pageWidth - 52, pageHeight - 52);

  document.setDrawColor(44, 113, 246);
  document.setLineWidth(1.2);
  document.rect(40, 40, pageWidth - 80, pageHeight - 80);

  const logoDataUrl = await loadImageAsDataUrl(logoUrl);
  if (logoDataUrl) {
    document.addImage(logoDataUrl, 'PNG', 70, 62, 110, 28);
  }

  document.setTextColor(20, 40, 90);
  document.setFont('helvetica', 'bold');
  document.setFontSize(14);
  document.text(brandName, pageWidth - 74, 82, { align: 'right' });

  document.setFont('times', 'bold');
  document.setFontSize(44);
  document.text('Certificate of Completion', centerX, 150, { align: 'center' });

  document.setFont('helvetica', 'normal');
  document.setFontSize(17);
  document.text('This is proudly presented to', centerX, 198, { align: 'center' });

  document.setTextColor(10, 32, 80);
  document.setFont('times', 'italic');
  document.setFontSize(40);
  document.text(studentName || 'Student', centerX, 250, { align: 'center' });

  document.setTextColor(30, 40, 60);
  document.setFont('helvetica', 'normal');
  document.setFontSize(16);
  document.text('for successfully completing the course', centerX, 290, { align: 'center' });

  document.setTextColor(20, 40, 90);
  document.setFont('helvetica', 'bold');
  document.setFontSize(28);

  const safeCourseTitle = courseTitle || 'Course';
  const wrappedCourseTitle = document.splitTextToSize(safeCourseTitle, pageWidth - 220);
  document.text(wrappedCourseTitle, centerX, 330, { align: 'center' });

  const issuedOn = new Date().toLocaleDateString();
  const leftSigner = issuerName || `${brandName} Academy`;
  const rightSigner = educatorName || 'Course Educator';

  document.setTextColor(40, 56, 88);
  document.setFont('helvetica', 'normal');
  document.setFontSize(14);
  document.text(`Completion: ${completionPercentage}%`, centerX - 130, 386, { align: 'center' });
  document.text(`Issued on: ${issuedOn}`, centerX + 130, 386, { align: 'center' });

  document.setDrawColor(90, 110, 150);
  document.setLineWidth(1);
  document.line(120, 458, 320, 458);
  document.line(pageWidth - 320, 458, pageWidth - 120, 458);

  const [leftSignatureData, rightSignatureData] = await Promise.all([
    loadImageAsDataUrl(leftSignatureUrl),
    loadImageAsDataUrl(rightSignatureUrl),
  ]);

  // Draw provided signature images if available; otherwise use stylized fallback text.
  if (leftSignatureData) {
    document.addImage(leftSignatureData, 'PNG', 145, 404, 150, 44);
  } else {
    document.setTextColor(36, 67, 132);
    document.setFont('times', 'italic');
    document.setFontSize(24);
    document.text('/s/ Edemy', 220, 446, { align: 'center' });
  }

  if (rightSignatureData) {
    document.addImage(rightSignatureData, 'PNG', pageWidth - 295, 404, 150, 44);
  } else {
    document.setTextColor(36, 67, 132);
    document.setFont('times', 'italic');
    document.setFontSize(24);
    document.text('/s/ Instructor', pageWidth - 220, 446, { align: 'center' });
  }

  // Decorative underlines to emulate pen strokes.
  document.setDrawColor(36, 67, 132);
  document.setLineWidth(0.8);
  document.line(162, 450, 278, 450);
  document.line(pageWidth - 278, 450, pageWidth - 162, 450);

  document.setTextColor(40, 56, 88);
  document.setFont('helvetica', 'normal');
  document.setFontSize(12);
  document.text(leftSigner, 220, 478, { align: 'center' });
  document.text(rightSigner, pageWidth - 220, 478, { align: 'center' });

  const fileName = `${safeCourseTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_certificate.pdf`;
  document.save(fileName);
};
