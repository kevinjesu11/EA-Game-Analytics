import matplotlib.pyplot as plt
C = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#64748b']
def apply_style():
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,
                         'axes.titleweight':'bold','axes.titlesize':11,'axes.grid':True,'grid.alpha':.25,'axes.edgecolor':'#999'})
