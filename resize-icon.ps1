Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

# Rutas de los archivos
$sourceImagePath = "C:\Users\Admin\Desktop\manageTime\assets\Work Proof LOGO CREMA.png"
$iconOutputPath = "C:\Users\Admin\Desktop\manageTime\assets\icon.png"
$splashOutputPath = "C:\Users\Admin\Desktop\manageTime\assets\splash.png"

# Crear la imagen para el ícono (1024x1024 px)
$iconCanvas = New-Object System.Drawing.Bitmap 1024, 1024
$iconGraphics = [System.Drawing.Graphics]::FromImage($iconCanvas)

# Establecer color de fondo (gris oscuro)
$backgroundColor = [System.Drawing.Color]::FromArgb(40, 40, 40)
$iconGraphics.Clear($backgroundColor)

# Cargar la imagen original
$originalImage = [System.Drawing.Image]::FromFile($sourceImagePath)

# Calcular tamaño para que ocupe gran parte del lienzo
$targetSize = 950 # Queremos que ocupe casi todo el espacio (950 de 1024)
$ratio = [Math]::Min($targetSize / $originalImage.Width, $targetSize / $originalImage.Height)
$newWidth = [int]($originalImage.Width * $ratio)
$newHeight = [int]($originalImage.Height * $ratio)

# Calcular posición centrada
$x = ($iconCanvas.Width - $newWidth) / 2
$y = ($iconCanvas.Height - $newHeight) / 2

# Dibujar la imagen centrada en el lienzo
$iconGraphics.DrawImage($originalImage, $x, $y, $newWidth, $newHeight)

# Guardar la imagen del ícono
$iconCanvas.Save($iconOutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Crear una copia para splash screen
$iconCanvas.Save($splashOutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Liberar recursos
$iconGraphics.Dispose()
$iconCanvas.Dispose()
$originalImage.Dispose()

Write-Host "¡Íconos creados exitosamente!"
