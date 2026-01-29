"""
Utility functions for the Chemical Equipment Visualizer
"""
import pandas as pd
from typing import Dict, List, Tuple


def validate_csv(file_path: str) -> Tuple[bool, str]:
    """
    Validate CSV file format and required columns
    
    Args:
        file_path: Path to CSV file
        
    Returns:
        Tuple of (is_valid, message)
    """
    required_columns = ['Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature']
    
    try:
        df = pd.read_csv(file_path)
        
        # Check columns
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            return False, f"Missing columns: {missing_cols}"
        
        # Check for empty rows
        if df.isnull().any().any():
            return False, "CSV contains null/empty values"
        
        # Check numeric columns
        numeric_cols = ['Flowrate', 'Pressure', 'Temperature']
        for col in numeric_cols:
            try:
                pd.to_numeric(df[col])
            except ValueError:
                return False, f"Column '{col}' contains non-numeric values"
        
        return True, "CSV is valid"
        
    except pd.errors.ParserError:
        return False, "Invalid CSV format"
    except Exception as e:
        return False, str(e)


def calculate_statistics(df: pd.DataFrame) -> Dict:
    """
    Calculate statistics from equipment data
    
    Args:
        df: DataFrame with equipment data
        
    Returns:
        Dictionary with statistics
    """
    return {
        'total_equipment': len(df),
        'avg_flowrate': float(df['Flowrate'].mean()),
        'avg_pressure': float(df['Pressure'].mean()),
        'avg_temperature': float(df['Temperature'].mean()),
        'min_flowrate': float(df['Flowrate'].min()),
        'max_flowrate': float(df['Flowrate'].max()),
        'min_pressure': float(df['Pressure'].min()),
        'max_pressure': float(df['Pressure'].max()),
        'min_temperature': float(df['Temperature'].min()),
        'max_temperature': float(df['Temperature'].max()),
        'type_distribution': df['Type'].value_counts().to_dict(),
    }


def format_equipment_data(df: pd.DataFrame) -> List[Dict]:
    """
    Format equipment data for API response
    
    Args:
        df: DataFrame with equipment data
        
    Returns:
        List of formatted equipment dictionaries
    """
    equipment_list = []
    for _, row in df.iterrows():
        equipment_list.append({
            'name': row['Equipment Name'],
            'type': row['Type'],
            'flowrate': float(row['Flowrate']),
            'pressure': float(row['Pressure']),
            'temperature': float(row['Temperature']),
        })
    return equipment_list


def generate_summary_text(stats: Dict) -> str:
    """
    Generate human-readable summary text
    
    Args:
        stats: Statistics dictionary
        
    Returns:
        Formatted summary text
    """
    text = f"""
Chemical Equipment Analysis Summary
==================================

Total Equipment: {stats['total_equipment']}

Flowrate Statistics:
  Average: {stats['avg_flowrate']:.2f}
  Min: {stats['min_flowrate']:.2f}
  Max: {stats['max_flowrate']:.2f}

Pressure Statistics:
  Average: {stats['avg_pressure']:.2f}
  Min: {stats['min_pressure']:.2f}
  Max: {stats['max_pressure']:.2f}

Temperature Statistics:
  Average: {stats['avg_temperature']:.2f}
  Min: {stats['min_temperature']:.2f}
  Max: {stats['max_temperature']:.2f}

Equipment Type Distribution:
"""
    for eq_type, count in stats['type_distribution'].items():
        text += f"  {eq_type}: {count}\n"
    
    return text
