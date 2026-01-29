import sys
import os
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QFileDialog, QTabWidget, QTableWidget,
    QTableWidgetItem, QComboBox, QMessageBox, QLineEdit, QDialog,
    QDialogButtonBox, QFormLayout, QTextEdit, QScrollArea, QGroupBox,
    QCheckBox, QPushButton as QButton
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QColor, QPalette
import requests
import json
from datetime import datetime
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import numpy as np

API_BASE_URL = 'http://localhost:8000/api'


class LoginDialog(QDialog):
    """Dialog for admin login"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle('Admin Login')
        self.setModal(True)
        self.token = None
        
        layout = QFormLayout()
        
        self.username_input = QLineEdit()
        self.password_input = QLineEdit()
        self.password_input.setEchoMode(QLineEdit.Password)
        
        layout.addRow('Username:', self.username_input)
        layout.addRow('Password:', self.password_input)
        
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.login)
        buttons.rejected.connect(self.reject)
        
        layout.addRow(buttons)
        self.setLayout(layout)
    
    def login(self):
        """Attempt to login"""
        username = self.username_input.text()
        password = self.password_input.text()
        
        try:
            response = requests.post(
                f'{API_BASE_URL}/auth/login/',
                json={'username': username, 'password': password}
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('token')
                QMessageBox.information(self, 'Success', f'Welcome, {username}!')
                self.accept()
            else:
                QMessageBox.warning(self, 'Error', 'Invalid credentials')
        except Exception as e:
            QMessageBox.critical(self, 'Error', f'Login failed: {str(e)}')


class UploadThread(QThread):
    """Thread for handling file uploads"""
    upload_finished = pyqtSignal(dict)
    upload_error = pyqtSignal(str)

    def __init__(self, file_path):
        super().__init__()
        self.file_path = file_path

    def run(self):
        try:
            with open(self.file_path, 'rb') as f:
                files = {'csv_file': f}
                response = requests.post(
                    f'{API_BASE_URL}/datasets/upload/',
                    files=files,
                    timeout=30
                )
                response.raise_for_status()
                self.upload_finished.emit(response.json())
        except Exception as e:
            self.upload_error.emit(str(e))


class FetchThread(QThread):
    """Thread for fetching datasets"""
    fetch_finished = pyqtSignal(list)
    fetch_error = pyqtSignal(str)

    def run(self):
        try:
            response = requests.get(f'{API_BASE_URL}/datasets/summary/', timeout=30)
            response.raise_for_status()
            data = response.json()
            self.fetch_finished.emit(data.get('datasets', []))
        except Exception as e:
            self.fetch_error.emit(str(e))


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Chemical Equipment Parameter Visualizer - Professional Edition')
        self.setGeometry(100, 100, 1400, 900)
        self.datasets = []
        self.current_dataset = None
        self.auth_token = None
        self.is_admin = False
        
        # Set dark theme
        self.set_dark_theme()
        
        self.init_ui()
        self.load_datasets()

    def set_dark_theme(self):
        """Apply modern dark theme"""
        palette = QPalette()
        palette.setColor(QPalette.Window, QColor(53, 53, 53))
        palette.setColor(QPalette.WindowText, Qt.white)
        palette.setColor(QPalette.Base, QColor(25, 25, 25))
        palette.setColor(QPalette.AlternateBase, QColor(53, 53, 53))
        palette.setColor(QPalette.ToolTipBase, Qt.white)
        palette.setColor(QPalette.ToolTipText, Qt.white)
        palette.setColor(QPalette.Text, Qt.white)
        palette.setColor(QPalette.Button, QColor(53, 53, 53))
        palette.setColor(QPalette.ButtonText, Qt.white)
        palette.setColor(QPalette.BrightText, Qt.red)
        palette.setColor(QPalette.Link, QColor(42, 130, 218))
        palette.setColor(QPalette.Highlight, QColor(42, 130, 218))
        palette.setColor(QPalette.HighlightedText, Qt.black)
        self.setPalette(palette)

    def init_ui(self):
        """Initialize the user interface"""
        main_widget = QWidget()
        self.setCentralWidget(main_widget)

        main_layout = QVBoxLayout()

        # Header
        header_widget = QWidget()
        header_widget.setStyleSheet("background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #667eea, stop:1 #764ba2); padding: 20px; border-radius: 10px;")
        header_layout = QHBoxLayout()
        
        header_label = QLabel('🔬 Chemical Equipment Parameter Visualizer - Pro')
        header_font = QFont()
        header_font.setPointSize(18)
        header_font.setBold(True)
        header_label.setFont(header_font)
        header_label.setStyleSheet("color: white;")
        header_layout.addWidget(header_label)
        
        # Admin login button
        self.admin_btn = QPushButton('🔐 Admin Login')
        self.admin_btn.clicked.connect(self.show_login)
        self.admin_btn.setStyleSheet("""
            QPushButton {
                background-color: rgba(255, 255, 255, 0.2);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: rgba(255, 255, 255, 0.3);
            }
        """)
        header_layout.addWidget(self.admin_btn)
        
        header_widget.setLayout(header_layout)
        main_layout.addWidget(header_widget)

        # Toolbar
        toolbar_layout = QHBoxLayout()
        
        upload_btn = QPushButton('📤 Upload CSV')
        upload_btn.clicked.connect(self.upload_file)
        upload_btn.setStyleSheet("""
            QPushButton {
                background-color: #667eea;
                color: white;
                padding: 12px 25px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #764ba2;
            }
        """)
        toolbar_layout.addWidget(upload_btn)

        toolbar_layout.addWidget(QLabel('📁 Select Dataset:'))
        self.dataset_combo = QComboBox()
        self.dataset_combo.currentIndexChanged.connect(self.on_dataset_selected)
        self.dataset_combo.setStyleSheet("""
            QComboBox {
                padding: 8px;
                border-radius: 4px;
                background-color: #353535;
                color: white;
                min-width: 300px;
            }
        """)
        toolbar_layout.addWidget(self.dataset_combo)
        
        refresh_btn = QPushButton('🔄 Refresh')
        refresh_btn.clicked.connect(self.load_datasets)
        refresh_btn.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)
        toolbar_layout.addWidget(refresh_btn)
        
        toolbar_layout.addStretch()

        main_layout.addLayout(toolbar_layout)

        # Tabs
        self.tabs = QTabWidget()
        self.tabs.setStyleSheet("""
            QTabWidget::pane {
                border: 1px solid #444;
                border-radius: 5px;
                background-color: #2a2a2a;
            }
            QTabBar::tab {
                background-color: #353535;
                color: white;
                padding: 12px 20px;
                margin-right: 2px;
                border-top-left-radius: 5px;
                border-top-right-radius: 5px;
            }
            QTabBar::tab:selected {
                background-color: #667eea;
            }
            QTabBar::tab:hover {
                background-color: #444;
            }
        """)

        # Summary Tab
        self.summary_widget = QWidget()
        self.summary_layout = QVBoxLayout()
        self.summary_widget.setLayout(self.summary_layout)
        self.tabs.addTab(self.summary_widget, '📊 Summary')

        # Data Table Tab
        self.table_widget = QTableWidget()
        self.table_widget.setColumnCount(5)
        self.table_widget.setHorizontalHeaderLabels([
            'Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature'
        ])
        self.table_widget.setStyleSheet("""
            QTableWidget {
                background-color: #2a2a2a;
                color: white;
                gridline-color: #444;
            }
            QHeaderView::section {
                background-color: #667eea;
                color: white;
                padding: 8px;
                border: none;
                font-weight: bold;
            }
        """)
        self.tabs.addTab(self.table_widget, '📋 Data Table')

        # Basic Charts Tab
        self.charts_widget = QWidget()
        self.charts_layout = QVBoxLayout()
        self.charts_widget.setLayout(self.charts_layout)
        self.tabs.addTab(self.charts_widget, '📈 Basic Charts')

        # Advanced Charts Tab
        self.advanced_charts_widget = QWidget()
        self.advanced_charts_layout = QVBoxLayout()
        self.advanced_charts_widget.setLayout(self.advanced_charts_layout)
        self.tabs.addTab(self.advanced_charts_widget, '🎯 Advanced Analytics')

        # Admin Panel Tab (hidden by default)
        self.admin_widget = QWidget()
        self.admin_layout = QVBoxLayout()
        self.admin_widget.setLayout(self.admin_layout)
        self.admin_tab_index = self.tabs.addTab(self.admin_widget, '🔒 Admin Panel')
        self.tabs.setTabEnabled(self.admin_tab_index, False)

        main_layout.addWidget(self.tabs)
        main_widget.setLayout(main_layout)

    def show_login(self):
        """Show login dialog"""
        if self.is_admin:
            reply = QMessageBox.question(self, 'Logout', 'Do you want to logout?',
                                       QMessageBox.Yes | QMessageBox.No)
            if reply == QMessageBox.Yes:
                self.is_admin = False
                self.auth_token = None
                self.admin_btn.setText('🔐 Admin Login')
                self.tabs.setTabEnabled(self.admin_tab_index, False)
        else:
            dialog = LoginDialog(self)
            if dialog.exec_() == QDialog.Accepted:
                self.is_admin = True
                self.auth_token = dialog.token
                self.admin_btn.setText('🔓 Logout')
                self.tabs.setTabEnabled(self.admin_tab_index, True)
                self.setup_admin_panel()

    def upload_file(self):
        """Handle file upload"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, 'Select CSV File', '', 'CSV Files (*.csv)'
        )

        if file_path:
            self.upload_thread = UploadThread(file_path)
            self.upload_thread.upload_finished.connect(self.on_upload_success)
            self.upload_thread.upload_error.connect(self.on_upload_error)
            self.upload_thread.start()

    def on_upload_success(self, data):
        """Handle successful upload"""
        QMessageBox.information(self, 'Success', 'File uploaded successfully!')
        self.load_datasets()

    def on_upload_error(self, error):
        """Handle upload error"""
        QMessageBox.critical(self, 'Error', f'Upload failed: {error}')

    def load_datasets(self):
        """Load datasets from API"""
        self.fetch_thread = FetchThread()
        self.fetch_thread.fetch_finished.connect(self.on_datasets_loaded)
        self.fetch_thread.fetch_error.connect(self.on_fetch_error)
        self.fetch_thread.start()

    def on_datasets_loaded(self, datasets):
        """Handle datasets loaded"""
        self.datasets = datasets
        self.dataset_combo.clear()

        for dataset in datasets:
            self.dataset_combo.addItem(dataset['filename'], dataset)

        if datasets:
            self.current_dataset = datasets[0]
            self.display_dataset()

    def on_fetch_error(self, error):
        """Handle fetch error"""
        QMessageBox.warning(self, 'Warning', f'Failed to load datasets: {error}')

    def on_dataset_selected(self, index):
        """Handle dataset selection"""
        if 0 <= index < len(self.datasets):
            self.current_dataset = self.datasets[index]
            self.display_dataset()

    def display_dataset(self):
        """Display the selected dataset"""
        if not self.current_dataset:
            return

        # Clear previous layouts
        while self.summary_layout.count():
            self.summary_layout.takeAt(0).widget().deleteLater()
        self.table_widget.setRowCount(0)
        while self.charts_layout.count():
            self.charts_layout.takeAt(0).widget().deleteLater()
        while self.advanced_charts_layout.count():
            self.advanced_charts_layout.takeAt(0).widget().deleteLater()

        # Display summary
        self.display_summary()

        # Display data table
        self.display_table()

        # Display charts
        self.display_charts()
        
        # Display advanced charts
        self.display_advanced_charts()

    def display_summary(self):
        """Display summary statistics"""
        dataset = self.current_dataset

        summary_label = QLabel(f"Dataset: {dataset['filename']}")
        summary_font = QFont()
        summary_font.setBold(True)
        summary_label.setFont(summary_font)
        self.summary_layout.addWidget(summary_label)

        # Stats
        stats_text = f"""
Total Equipment: {dataset['equipment_count']}
Average Flowrate: {dataset['avg_flowrate']:.2f}
Average Pressure: {dataset['avg_pressure']:.2f}
Average Temperature: {dataset['avg_temperature']:.2f}
Upload Date: {dataset['upload_date']}

Equipment Type Distribution:
"""
        for eq_type, count in dataset['type_distribution'].items():
            stats_text += f"\n  {eq_type}: {count}"

        stats_label = QLabel(stats_text)
        self.summary_layout.addWidget(stats_label)
        self.summary_layout.addStretch()

    def display_table(self):
        """Display equipment data table"""
        dataset = self.current_dataset
        equipment_items = dataset.get('equipment_items', [])

        self.table_widget.setRowCount(len(equipment_items))

        for row, equipment in enumerate(equipment_items):
            self.table_widget.setItem(row, 0, QTableWidgetItem(equipment['name']))
            self.table_widget.setItem(row, 1, QTableWidgetItem(equipment['equipment_type']))
            self.table_widget.setItem(row, 2, QTableWidgetItem(f"{equipment['flowrate']:.2f}"))
            self.table_widget.setItem(row, 3, QTableWidgetItem(f"{equipment['pressure']:.2f}"))
            self.table_widget.setItem(row, 4, QTableWidgetItem(f"{equipment['temperature']:.2f}"))

        self.table_widget.resizeColumnsToContents()

    def display_charts(self):
        """Display basic charts"""
        dataset = self.current_dataset
        equipment_items = dataset.get('equipment_items', [])

        if not equipment_items:
            self.charts_layout.addWidget(QLabel('No data available for charts'))
            return

        # Create matplotlib figure for basic charts
        fig = Figure(figsize=(14, 10), dpi=100, facecolor='#2a2a2a')

        # Extract data
        names = [eq['name'] for eq in equipment_items]
        flowrates = [eq['flowrate'] for eq in equipment_items]
        pressures = [eq['pressure'] for eq in equipment_items]
        temperatures = [eq['temperature'] for eq in equipment_items]

        # Flowrate chart
        ax1 = fig.add_subplot(2, 2, 1, facecolor='#353535')
        ax1.bar(range(len(names)), flowrates, color='#00bfa5', edgecolor='white', linewidth=0.5)
        ax1.set_title('Flowrate by Equipment', color='white', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Flowrate', color='white')
        ax1.set_xticks(range(len(names)))
        ax1.set_xticklabels(names, rotation=45, ha='right', color='white')
        ax1.tick_params(colors='white')
        ax1.grid(True, alpha=0.2, color='white')

        # Pressure chart
        ax2 = fig.add_subplot(2, 2, 2, facecolor='#353535')
        ax2.bar(range(len(names)), pressures, color='#ff6b6b', edgecolor='white', linewidth=0.5)
        ax2.set_title('Pressure by Equipment', color='white', fontsize=14, fontweight='bold')
        ax2.set_ylabel('Pressure', color='white')
        ax2.set_xticks(range(len(names)))
        ax2.set_xticklabels(names, rotation=45, ha='right', color='white')
        ax2.tick_params(colors='white')
        ax2.grid(True, alpha=0.2, color='white')

        # Temperature chart
        ax3 = fig.add_subplot(2, 2, 3, facecolor='#353535')
        ax3.plot(range(len(names)), temperatures, marker='o', color='#ffd93d', 
                linewidth=3, markersize=8, markerfacecolor='#ff6b6b')
        ax3.set_title('Temperature Trend', color='white', fontsize=14, fontweight='bold')
        ax3.set_ylabel('Temperature', color='white')
        ax3.set_xlabel('Equipment', color='white')
        ax3.set_xticks(range(len(names)))
        ax3.set_xticklabels(names, rotation=45, ha='right', color='white')
        ax3.tick_params(colors='white')
        ax3.grid(True, alpha=0.3, color='white')

        # Type distribution
        ax4 = fig.add_subplot(2, 2, 4, facecolor='#353535')
        type_dist = dataset['type_distribution']
        colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f', '#bb8fce', '#52b788']
        wedges, texts, autotexts = ax4.pie(
            type_dist.values(), 
            labels=type_dist.keys(), 
            autopct='%1.1f%%',
            colors=colors[:len(type_dist)],
            textprops={'color': 'white', 'fontsize': 10}
        )
        ax4.set_title('Equipment Type Distribution', color='white', fontsize=14, fontweight='bold')

        fig.tight_layout(pad=3.0)

        canvas = FigureCanvas(fig)
        self.charts_layout.addWidget(canvas)

    def display_advanced_charts(self):
        """Display advanced analytics charts"""
        dataset = self.current_dataset
        equipment_items = dataset.get('equipment_items', [])

        if not equipment_items:
            self.advanced_charts_layout.addWidget(QLabel('No data available for advanced charts'))
            return

        # Create matplotlib figure for advanced charts
        fig = Figure(figsize=(16, 12), dpi=100, facecolor='#2a2a2a')

        # Extract data
        names = [eq['name'] for eq in equipment_items]
        flowrates = np.array([eq['flowrate'] for eq in equipment_items])
        pressures = np.array([eq['pressure'] for eq in equipment_items])
        temperatures = np.array([eq['temperature'] for eq in equipment_items])

        # Correlation scatter plot
        ax1 = fig.add_subplot(2, 3, 1, facecolor='#353535')
        scatter = ax1.scatter(temperatures, pressures, c=flowrates, cmap='plasma', 
                            s=200, alpha=0.7, edgecolors='white', linewidth=1.5)
        ax1.set_title('Pressure vs Temperature (colored by Flowrate)', 
                     color='white', fontsize=12, fontweight='bold')
        ax1.set_xlabel('Temperature', color='white')
        ax1.set_ylabel('Pressure', color='white')
        ax1.tick_params(colors='white')
        ax1.grid(True, alpha=0.2, color='white')
        cbar = fig.colorbar(scatter, ax=ax1)
        cbar.set_label('Flowrate', color='white')
        cbar.ax.tick_params(colors='white')

        # Box plot
        ax2 = fig.add_subplot(2, 3, 2, facecolor='#353535')
        box_data = [flowrates, pressures, temperatures]
        bp = ax2.boxplot(box_data, labels=['Flowrate', 'Pressure', 'Temperature'],
                        patch_artist=True, notch=True)
        for patch, color in zip(bp['boxes'], ['#00bfa5', '#ff6b6b', '#ffd93d']):
            patch.set_facecolor(color)
            patch.set_alpha(0.7)
        ax2.set_title('Parameter Distribution Analysis', color='white', fontsize=12, fontweight='bold')
        ax2.tick_params(colors='white')
        ax2.grid(True, alpha=0.2, color='white')

        # Heatmap of correlations
        ax3 = fig.add_subplot(2, 3, 3, facecolor='#353535')
        data_matrix = np.array([flowrates, pressures, temperatures])
        correlation = np.corrcoef(data_matrix)
        im = ax3.imshow(correlation, cmap='RdYlGn', aspect='auto', vmin=-1, vmax=1)
        ax3.set_xticks([0, 1, 2])
        ax3.set_yticks([0, 1, 2])
        ax3.set_xticklabels(['Flowrate', 'Pressure', 'Temp'], color='white')
        ax3.set_yticklabels(['Flowrate', 'Pressure', 'Temp'], color='white')
        ax3.set_title('Correlation Matrix', color='white', fontsize=12, fontweight='bold')
        for i in range(3):
            for j in range(3):
                text = ax3.text(j, i, f'{correlation[i, j]:.2f}',
                              ha="center", va="center", color="black", fontweight='bold')
        cbar = fig.colorbar(im, ax=ax3)
        cbar.ax.tick_params(colors='white')

        # Multi-line trend
        ax4 = fig.add_subplot(2, 3, 4, facecolor='#353535')
        ax4.plot(range(len(names)), flowrates, marker='o', label='Flowrate', 
                linewidth=2, markersize=6, color='#00bfa5')
        ax4.plot(range(len(names)), pressures, marker='s', label='Pressure', 
                linewidth=2, markersize=6, color='#ff6b6b')
        ax4.plot(range(len(names)), temperatures, marker='^', label='Temperature', 
                linewidth=2, markersize=6, color='#ffd93d')
        ax4.set_title('Multi-Parameter Trend Comparison', color='white', fontsize=12, fontweight='bold')
        ax4.set_xlabel('Equipment Index', color='white')
        ax4.set_ylabel('Value', color='white')
        ax4.legend(facecolor='#353535', edgecolor='white', labelcolor='white')
        ax4.tick_params(colors='white')
        ax4.grid(True, alpha=0.3, color='white')

        # Histogram
        ax5 = fig.add_subplot(2, 3, 5, facecolor='#353535')
        ax5.hist(flowrates, bins=10, alpha=0.7, label='Flowrate', color='#00bfa5', edgecolor='white')
        ax5.hist(pressures, bins=10, alpha=0.7, label='Pressure', color='#ff6b6b', edgecolor='white')
        ax5.hist(temperatures, bins=10, alpha=0.7, label='Temperature', color='#ffd93d', edgecolor='white')
        ax5.set_title('Parameter Distribution Histogram', color='white', fontsize=12, fontweight='bold')
        ax5.set_xlabel('Value', color='white')
        ax5.set_ylabel('Frequency', color='white')
        ax5.legend(facecolor='#353535', edgecolor='white', labelcolor='white')
        ax5.tick_params(colors='white')
        ax5.grid(True, alpha=0.2, color='white')

        # Statistical summary
        ax6 = fig.add_subplot(2, 3, 6, facecolor='#353535')
        ax6.axis('off')
        stats_text = f"""
        📊 Statistical Analysis
        
        Flowrate:
          • Mean: {np.mean(flowrates):.2f}
          • Std Dev: {np.std(flowrates):.2f}
          • Min: {np.min(flowrates):.2f}
          • Max: {np.max(flowrates):.2f}
          
        Pressure:
          • Mean: {np.mean(pressures):.2f}
          • Std Dev: {np.std(pressures):.2f}
          • Min: {np.min(pressures):.2f}
          • Max: {np.max(pressures):.2f}
          
        Temperature:
          • Mean: {np.mean(temperatures):.2f}
          • Std Dev: {np.std(temperatures):.2f}
          • Min: {np.min(temperatures):.2f}
          • Max: {np.max(temperatures):.2f}
        """
        ax6.text(0.1, 0.5, stats_text, fontsize=11, color='white', 
                family='monospace', verticalalignment='center')

        fig.tight_layout(pad=2.0)

        canvas = FigureCanvas(fig)
        self.advanced_charts_layout.addWidget(canvas)

    def setup_admin_panel(self):
        """Setup the admin panel"""
        while self.admin_layout.count():
            self.admin_layout.takeAt(0).widget().deleteLater()
        
        admin_label = QLabel('🔒 Admin Dashboard')
        admin_font = QFont()
        admin_font.setPointSize(16)
        admin_font.setBold(True)
        admin_label.setFont(admin_font)
        admin_label.setStyleSheet("color: #667eea; padding: 10px;")
        self.admin_layout.addWidget(admin_label)
        
        # Admin statistics
        stats_group = QGroupBox('System Statistics')
        stats_group.setStyleSheet("""
            QGroupBox {
                color: white;
                border: 2px solid #667eea;
                border-radius: 5px;
                margin-top: 10px;
                padding: 15px;
                font-weight: bold;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px;
            }
        """)
        stats_layout = QVBoxLayout()
        
        total_datasets_label = QLabel(f'Total Datasets: {len(self.datasets)}')
        total_datasets_label.setStyleSheet("color: white; font-size: 14px; padding: 5px;")
        stats_layout.addWidget(total_datasets_label)
        
        if self.current_dataset:
            current_stats = QLabel(f"""
Current Dataset: {self.current_dataset['filename']}
Equipment Count: {self.current_dataset['equipment_count']}
Avg Flowrate: {self.current_dataset['avg_flowrate']:.2f}
Avg Pressure: {self.current_dataset['avg_pressure']:.2f}
Avg Temperature: {self.current_dataset['avg_temperature']:.2f}
            """)
            current_stats.setStyleSheet("color: white; font-size: 12px; padding: 5px;")
            stats_layout.addWidget(current_stats)
        
        stats_group.setLayout(stats_layout)
        self.admin_layout.addWidget(stats_group)
        
        # Admin actions
        actions_group = QGroupBox('Admin Actions')
        actions_group.setStyleSheet("""
            QGroupBox {
                color: white;
                border: 2px solid #667eea;
                border-radius: 5px;
                margin-top: 10px;
                padding: 15px;
                font-weight: bold;
            }
        """)
        actions_layout = QVBoxLayout()
        
        export_btn = QPushButton('📥 Export All Data (JSON)')
        export_btn.clicked.connect(self.export_all_data)
        export_btn.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                padding: 12px;
                border-radius: 5px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)
        actions_layout.addWidget(export_btn)
        
        pdf_btn = QPushButton('📄 Generate PDF Report')
        pdf_btn.clicked.connect(self.generate_pdf_report)
        pdf_btn.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                color: white;
                padding: 12px;
                border-radius: 5px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #0b7dda;
            }
        """)
        actions_layout.addWidget(pdf_btn)
        
        actions_group.setLayout(actions_layout)
        self.admin_layout.addWidget(actions_group)
        
        self.admin_layout.addStretch()

    def export_all_data(self):
        """Export all datasets to JSON"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, 'Export Data', '', 'JSON Files (*.json)'
        )
        if file_path:
            try:
                with open(file_path, 'w') as f:
                    json.dump(self.datasets, f, indent=2)
                QMessageBox.information(self, 'Success', f'Data exported to {file_path}')
            except Exception as e:
                QMessageBox.critical(self, 'Error', f'Export failed: {str(e)}')

    def generate_pdf_report(self):
        """Generate PDF report for current dataset"""
        if not self.current_dataset:
            QMessageBox.warning(self, 'Warning', 'Please select a dataset first')
            return
        
        try:
            response = requests.get(
                f"{API_BASE_URL}/pdf/{self.current_dataset['id']}/generate_pdf/",
                timeout=30
            )
            if response.status_code == 200:
                file_path, _ = QFileDialog.getSaveFileName(
                    self, 'Save PDF Report', f"report_{self.current_dataset['id']}.pdf", 
                    'PDF Files (*.pdf)'
                )
                if file_path:
                    with open(file_path, 'wb') as f:
                        f.write(response.content)
                    QMessageBox.information(self, 'Success', f'PDF report saved to {file_path}')
            else:
                QMessageBox.warning(self, 'Error', 'Failed to generate PDF report')
        except Exception as e:
            QMessageBox.critical(self, 'Error', f'PDF generation failed: {str(e)}')



def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())


if __name__ == '__main__':
    main()
