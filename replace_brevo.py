import os

files_to_update = [
    r'src\app\api\admin\orders\refund\route.ts',
    r'src\app\api\admin\orders\ship\route.ts',
    r'src\app\api\admin\shiprocket\create-order\route.ts',
    r'src\app\api\auth\forgot-password\route.ts',
    r'src\app\api\checkout\verify\route.ts',
    r'src\app\api\emails\welcome\route.ts',
    r'src\app\api\support\tickets\route.ts',
    r'src\app\api\support\tickets\[id]\messages\route.ts',
    r'src\app\api\support\tickets\[id]\route.ts',
    r'src\lib\orders\finalize-phonepe-order.ts'
]

for file_path in files_to_update:
    full_path = os.path.join(r'c:\Users\INDIA\Desktop\Project Ruhvi', file_path)
    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content.replace('@/lib/brevo', '@/lib/resend')
        
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {file_path}')
    else:
        print(f'File not found: {file_path}')
