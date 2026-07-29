"""
PDF Export Service
Comprehensive PDF generation for user data export
"""
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus.flowables import HRFlowable
import io
from datetime import datetime, timezone
from typing import Dict, List

class PDFExportService:
    """Service for generating comprehensive PDF exports of user data"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom styles for the PDF"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#2563eb'),
            alignment=TA_CENTER
        ))

        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceBefore=20,
            spaceAfter=12,
            textColor=colors.HexColor('#1e40af'),
            borderWidth=0,
            borderColor=colors.HexColor('#e5e7eb'),
            borderPadding=5
        ))

        # Subsection style
        self.styles.add(ParagraphStyle(
            name='SubSection',
            parent=self.styles['Heading3'],
            fontSize=14,
            spaceBefore=15,
            spaceAfter=8,
            textColor=colors.HexColor('#374151')
        ))

        # Data style
        self.styles.add(ParagraphStyle(
            name='DataStyle',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            leftIndent=20
        ))

        # Code style
        self.styles.add(ParagraphStyle(
            name='CodeStyle',
            parent=self.styles['Normal'],
            fontSize=9,
            fontName='Courier',
            leftIndent=20,
            backgroundColor=colors.HexColor('#f3f4f6'),
            borderWidth=1,
            borderColor=colors.HexColor('#d1d5db'),
            borderPadding=8
        ))

    def generate_comprehensive_export(
        self,
        user_data: Dict,
        profile_data: Dict,
        sessions_data: List[Dict],
        analytics_data: Dict,
        login_history: List[Dict],
        active_sessions: List[Dict]
    ) -> io.BytesIO:
        """Generate a comprehensive PDF export of all user data"""

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )

        # Build the document content
        story = []

        # Title page
        story.extend(self._build_title_page(user_data))
        story.append(PageBreak())

        # Profile information
        story.extend(self._build_profile_section(user_data, profile_data))
        story.append(Spacer(1, 20))

        # Analytics overview
        story.extend(self._build_analytics_section(analytics_data))
        story.append(Spacer(1, 20))

        # Sessions summary
        story.extend(self._build_sessions_summary(sessions_data))
        story.append(PageBreak())

        # Detailed sessions
        story.extend(self._build_detailed_sessions(sessions_data))

        # Security information
        story.extend(self._build_security_section(login_history, active_sessions))

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

    def _build_title_page(self, user_data: Dict) -> List:
        """Build the title page"""
        story = []

        # Main title
        story.append(Paragraph("AI Code Optimizer", self.styles['CustomTitle']))
        story.append(Spacer(1, 20))

        # Subtitle
        story.append(Paragraph("Data Export Report", self.styles['Heading2']))
        story.append(Spacer(1, 30))

        # User info
        story.append(Paragraph(f"<b>User:</b> {user_data.get('name', 'N/A')}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Email:</b> {user_data.get('email', 'N/A')}", self.styles['Normal']))
        story.append(Paragraph(f"<b>Generated:</b> {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}", self.styles['Normal']))

        story.append(Spacer(1, 40))

        # Table of contents
        story.append(Paragraph("Contents", self.styles['Heading2']))
        story.append(Spacer(1, 10))

        toc_items = [
            "1. Profile Information",
            "2. Usage Analytics",
            "3. Sessions Summary",
            "4. Detailed Sessions",
            "5. Security Information"
        ]

        for item in toc_items:
            story.append(Paragraph(item, self.styles['Normal']))

        return story

    def _build_profile_section(self, user_data: Dict, profile_data: Dict) -> List:
        """Build the profile information section"""
        story = []

        story.append(Paragraph("1. Profile Information", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 10))

        # Basic info
        story.append(Paragraph("Basic Information", self.styles['SubSection']))

        basic_data = [
            ['Name', user_data.get('name', 'Not set')],
            ['Email', user_data.get('email', 'Not set')],
            ['Phone', user_data.get('phone', 'Not set')],
            ['Phone Verified', 'Yes' if user_data.get('phone_verified') else 'No'],
            ['Account Created', self._format_datetime(user_data.get('created_at'))],
            ['Last Updated', self._format_datetime(user_data.get('updated_at'))],
        ]

        basic_table = Table(basic_data, colWidths=[2*inch, 4*inch])
        basic_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f9fafb')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db'))
        ]))
        story.append(basic_table)
        story.append(Spacer(1, 15))

        # Profile details if available
        if profile_data:
            story.append(Paragraph("Profile Details", self.styles['SubSection']))

            # Bio
            bio = profile_data.get('bio', 'Not set')
            story.append(Paragraph(f"<b>Bio:</b> {bio}", self.styles['DataStyle']))

            # Location
            location = profile_data.get('location', {})
            if location:
                story.append(Paragraph(f"<b>Location:</b> {location.get('city', '')}, {location.get('country', '')}", self.styles['DataStyle']))
                story.append(Paragraph(f"<b>Timezone:</b> {location.get('timezone', 'Not set')}", self.styles['DataStyle']))

            # Professional info
            professional = profile_data.get('professional', {})
            if professional:
                story.append(Paragraph(f"<b>Job Title:</b> {professional.get('job_title', 'Not set')}", self.styles['DataStyle']))
                story.append(Paragraph(f"<b>Company:</b> {professional.get('company', 'Not set')}", self.styles['DataStyle']))
                story.append(Paragraph(f"<b>Experience Level:</b> {professional.get('experience_level', 'Not set')}", self.styles['DataStyle']))

            # Social links
            social_links = profile_data.get('social_links', {})
            if social_links:
                story.append(Paragraph("Social Links", self.styles['SubSection']))
                for platform, url in social_links.items():
                    if url:
                        story.append(Paragraph(f"<b>{platform.title()}:</b> {url}", self.styles['DataStyle']))

        return story

    def _build_analytics_section(self, analytics_data: Dict) -> List:
        """Build the analytics section"""
        story = []

        story.append(Paragraph("2. Usage Analytics", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 10))

        # Summary stats
        summary_data = [
            ['Total Sessions', str(analytics_data.get('total_sessions', 0))],
            ['Recent Sessions (30 days)', str(analytics_data.get('recent_sessions', 0))],
            ['Total Optimizations', str(analytics_data.get('total_optimizations', 0))],
            ['Account Age (days)', str(analytics_data.get('account_age_days', 0))],
            ['Profile Completion', f"{analytics_data.get('profile_completion', 0)}%"],
        ]

        summary_table = Table(summary_data, colWidths=[2.5*inch, 1.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f9fafb')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db'))
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 15))

        # Languages used
        languages_used = analytics_data.get('languages_used', {})
        if languages_used:
            story.append(Paragraph("Programming Languages Used", self.styles['SubSection']))
            lang_data = [['Language', 'Usage Count']]
            for lang, count in sorted(languages_used.items(), key=lambda x: x[1], reverse=True):
                lang_data.append([lang, str(count)])

            lang_table = Table(lang_data, colWidths=[2*inch, 1*inch])
            lang_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db'))
            ]))
            story.append(lang_table)
            story.append(Spacer(1, 15))

        # AI providers used
        ai_providers = analytics_data.get('ai_providers_used', {})
        if ai_providers:
            story.append(Paragraph("AI Providers Used", self.styles['SubSection']))
            provider_data = [['Provider', 'Usage Count']]
            for provider, count in sorted(ai_providers.items(), key=lambda x: x[1], reverse=True):
                provider_data.append([provider.title(), str(count)])

            provider_table = Table(provider_data, colWidths=[2*inch, 1*inch])
            provider_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db'))
            ]))
            story.append(provider_table)

        return story

    def _build_sessions_summary(self, sessions_data: List[Dict]) -> List:
        """Build the sessions summary section"""
        story = []

        story.append(Paragraph("3. Sessions Summary", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 10))

        if not sessions_data:
            story.append(Paragraph("No optimization sessions found.", self.styles['Normal']))
            return story

        story.append(Paragraph(f"Total Sessions: {len(sessions_data)}", self.styles['SubSection']))

        # Recent sessions table
        recent_sessions = sessions_data[:10]  # Show last 10 sessions

        session_data = [['Date', 'Title', 'Language', 'Task', 'Provider']]
        for session in recent_sessions:
            session_data.append([
                self._format_datetime(session.get('created_at'), short=True),
                self._truncate_text(session.get('title', 'Untitled'), 25),
                session.get('language', 'N/A'),
                session.get('task', 'N/A'),
                session.get('provider_used', 'N/A')
            ])

        sessions_table = Table(session_data, colWidths=[1.2*inch, 2*inch, 0.8*inch, 1*inch, 1*inch])
        sessions_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP')
        ]))
        story.append(sessions_table)

        if len(sessions_data) > 10:
            story.append(Spacer(1, 10))
            story.append(Paragraph(f"... and {len(sessions_data) - 10} more sessions (see detailed section)",
                                 self.styles['Normal']))

        return story

    def _build_detailed_sessions(self, sessions_data: List[Dict]) -> List:
        """Build the detailed sessions section"""
        story = []

        story.append(Paragraph("4. Detailed Sessions", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 10))

        if not sessions_data:
            story.append(Paragraph("No sessions to display.", self.styles['Normal']))
            return story

        # Limit to first 20 sessions to avoid huge PDFs
        limited_sessions = sessions_data[:20]

        for i, session in enumerate(limited_sessions, 1):
            # Session header
            title = session.get('title', f'Session {i}')
            story.append(Paragraph(f"Session {i}: {title}", self.styles['SubSection']))

            # Session details
            story.append(Paragraph(
                f"<b>Date:</b> {self._format_datetime(session.get('created_at'))}<br/>"
                f"<b>Language:</b> {session.get('language', 'N/A')}<br/>"
                f"<b>Task:</b> {session.get('task', 'N/A')}<br/>"
                f"<b>Provider:</b> {session.get('provider_used', 'N/A')}",
                self.styles['DataStyle']
            ))

            # Original code
            original_code = session.get('code', '')
            if original_code:
                story.append(Paragraph("Original Code:", self.styles['Normal']))
                story.append(Paragraph(self._truncate_text(original_code, 500), self.styles['CodeStyle']))
                story.append(Spacer(1, 8))

            # Result/Optimized code
            result = session.get('result', '')
            if result:
                story.append(Paragraph("AI Result:", self.styles['Normal']))
                story.append(Paragraph(self._truncate_text(result, 500), self.styles['CodeStyle']))

            story.append(Spacer(1, 15))

            # Add page break every 5 sessions to avoid overly long pages
            if i % 5 == 0 and i < len(limited_sessions):
                story.append(PageBreak())

        if len(sessions_data) > 20:
            story.append(Paragraph(
                f"Note: Only the first 20 sessions are shown in detail. "
                f"You have {len(sessions_data) - 20} additional sessions.",
                self.styles['Normal']
            ))

        return story

    def _build_security_section(self, login_history: List[Dict], active_sessions: List[Dict]) -> List:
        """Build the security information section"""
        story = []

        story.append(PageBreak())
        story.append(Paragraph("5. Security Information", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 10))

        # Active sessions
        story.append(Paragraph("Active Sessions", self.styles['SubSection']))
        if not active_sessions:
            story.append(Paragraph("No active sessions found.", self.styles['Normal']))
        else:
            session_data = [['Device', 'IP Address', 'Location', 'Last Activity']]
            for session in active_sessions[:10]:  # Limit to 10
                device_info = session.get('device_info', {})
                location = session.get('location', {})
                session_data.append([
                    device_info.get('device', 'Unknown'),
                    session.get('ip_address', 'N/A'),
                    f"{location.get('city', '')}, {location.get('country', '')}" if location else 'Unknown',
                    self._format_datetime(session.get('last_activity'), short=True)
                ])

            active_table = Table(session_data, colWidths=[1.5*inch, 1.2*inch, 1.5*inch, 1.3*inch])
            active_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db'))
            ]))
            story.append(active_table)

        story.append(Spacer(1, 20))

        # Recent login history
        story.append(Paragraph("Recent Login History", self.styles['SubSection']))
        if not login_history:
            story.append(Paragraph("No login history found.", self.styles['Normal']))
        else:
            login_data = [['Date', 'IP Address', 'Device', 'Status']]
            for login in login_history[:15]:  # Limit to 15
                device_info = login.get('device_info', {})
                login_data.append([
                    self._format_datetime(login.get('created_at'), short=True),
                    login.get('ip_address', 'N/A'),
                    device_info.get('device', 'Unknown'),
                    'Success' if login.get('success') else 'Failed'
                ])

            login_table = Table(login_data, colWidths=[1.3*inch, 1.2*inch, 2*inch, 0.8*inch])
            login_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#111827')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db'))
            ]))
            story.append(login_table)

        return story

    def _format_datetime(self, dt, short: bool = False) -> str:
        """Format datetime for display"""
        if not dt:
            return 'N/A'

        if isinstance(dt, str):
            try:
                dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                return dt  # Return as-is if parsing fails

        if short:
            return dt.strftime('%m/%d/%Y')
        else:
            return dt.strftime('%B %d, %Y at %H:%M UTC')

    def _truncate_text(self, text: str, max_length: int) -> str:
        """Truncate text to specified length"""
        if not text:
            return 'N/A'
        if len(text) <= max_length:
            return text
        return text[:max_length] + '...'


# Export the service
pdf_export_service = PDFExportService()
