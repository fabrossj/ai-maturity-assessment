import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font
} from '@react-pdf/renderer';
import { TotalScore, AreaScore, ElementScore } from '@/lib/scoring/formulas';

// Register font for Italian characters support
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf',
      fontWeight: 400
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf',
      fontWeight: 700
    }
  ]
});

const colors = {
  primary: '#2563eb',
  primaryDark: '#1e40af',
  text: '#333333',
  textLight: '#666666',
  textMuted: '#475569',
  background: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0'
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto',
    fontSize: 11,
    color: colors.text,
    lineHeight: 1.5
  },

  // Header
  header: {
    textAlign: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
    borderBottomStyle: 'solid'
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 10
  },
  metaInfo: {
    marginTop: 10
  },
  metaText: {
    fontSize: 10,
    color: colors.textLight,
    marginBottom: 3
  },
  metaLabel: {
    fontWeight: 700
  },

  // Overall Score Box
  overallScoreBox: {
    backgroundColor: colors.primary,
    padding: 25,
    borderRadius: 8,
    marginBottom: 25,
    textAlign: 'center'
  },
  overallScoreLabel: {
    fontSize: 12,
    color: colors.white,
    marginBottom: 8
  },
  overallScoreValue: {
    fontSize: 48,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 8
  },
  maturityLevel: {
    fontSize: 14,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 2
  },

  // Areas Section
  areasSection: {
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 15
  },

  // Area Card
  areaCard: {
    backgroundColor: colors.background,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderLeftStyle: 'solid',
    padding: 15,
    marginBottom: 15,
    borderRadius: 4
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  areaName: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primaryDark,
    flex: 1
  },
  areaScore: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.primary
  },

  // Elements
  elementsContainer: {
    marginTop: 8
  },
  elementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 8,
    marginBottom: 4,
    borderRadius: 3
  },
  elementCode: {
    fontSize: 10,
    color: colors.textMuted
  },
  elementScore: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.primary
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    borderTopStyle: 'solid',
    textAlign: 'center'
  },
  footerText: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 2
  },

  // Page number
  pageNumber: {
    position: 'absolute',
    bottom: 15,
    right: 30,
    fontSize: 9,
    color: colors.textLight
  }
});

export interface AssessmentPDFData {
  userName: string | null;
  userEmail: string;
  submittedAt: Date | null;
  scores: TotalScore;
}

interface AssessmentPDFProps {
  data: AssessmentPDFData;
}

function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function toFiveScale(percentage: number): string {
  return (percentage / 20).toFixed(1);
}

const AreaCard = ({ area }: { area: AreaScore }) => (
  <View style={styles.areaCard}>
    <View style={styles.areaHeader}>
      <Text style={styles.areaName}>{area.name}</Text>
      <Text style={styles.areaScore}>{toFiveScale(area.areaPercentage)}/5.0</Text>
    </View>
    <View style={styles.elementsContainer}>
      {area.elements.map((element: ElementScore) => (
        <View key={element.code} style={styles.elementRow}>
          <Text style={styles.elementCode}>{element.code}</Text>
          <Text style={styles.elementScore}>{toFiveScale(element.percentage)}/5.0</Text>
        </View>
      ))}
    </View>
  </View>
);

export const AssessmentPDF = ({ data }: AssessmentPDFProps) => {
  const { userName, userEmail, submittedAt, scores } = data;
  const displayName = userName || userEmail;
  const currentYear = new Date().getFullYear();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Maturity Assessment Report</Text>
          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>
              <Text style={styles.metaLabel}>User: </Text>
              {displayName}
            </Text>
            <Text style={styles.metaText}>
              <Text style={styles.metaLabel}>Submitted: </Text>
              {formatDate(submittedAt)}
            </Text>
            <Text style={styles.metaText}>
              <Text style={styles.metaLabel}>Report Generated: </Text>
              {formatDate(new Date())}
            </Text>
          </View>
        </View>

        {/* Overall Score */}
        <View style={styles.overallScoreBox}>
          <Text style={styles.overallScoreLabel}>Overall AI Maturity Score</Text>
          <Text style={styles.overallScoreValue}>
            {scores.totalScore.toFixed(1)}/5.0
          </Text>
          <Text style={styles.maturityLevel}>Level: {scores.maturityLevel}</Text>
        </View>

        {/* Areas Section */}
        <View style={styles.areasSection}>
          <Text style={styles.sectionTitle}>Detailed Scores by Area</Text>
          {scores.areas.map((area: AreaScore) => (
            <AreaCard key={area.code} area={area} />
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            © {currentYear} AI Maturity Assessment Platform
          </Text>
          <Text style={styles.footerText}>
            This report is confidential and intended solely for the recipient.
          </Text>
        </View>

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
};

export default AssessmentPDF;
