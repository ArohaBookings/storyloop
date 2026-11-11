// Turns a folder of numbered PNG frames into an H.264 MP4 that every phone
// plays (scripts/film/README.md). No ffmpeg needed: AVFoundation ships with macOS.
// usage: encode <framesDir> <out.mp4> <width> <height> <fps> <bitsPerSecond>
import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

let a = CommandLine.arguments
guard a.count >= 7, let width = Int(a[3]), let height = Int(a[4]), let fps = Int32(a[5]), let bitrate = Int(a[6]) else {
  FileHandle.standardError.write("usage: encode <framesDir> <out.mp4> <width> <height> <fps> <bitsPerSecond>\n".data(using: .utf8)!)
  exit(2)
}
let dir = URL(fileURLWithPath: a[1])
let out = URL(fileURLWithPath: a[2])
let files = try FileManager.default.contentsOfDirectory(atPath: dir.path).filter { $0.hasSuffix(".png") }.sorted()
guard !files.isEmpty else { fatalError("no frames in \(dir.path)") }
try? FileManager.default.removeItem(at: out)

let writer = try AVAssetWriter(outputURL: out, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true  // the index goes first, so it starts playing before it has all arrived
let settings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: width,
  AVVideoHeightKey: height,
  AVVideoColorPropertiesKey: [
    AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
    AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
    AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
  ],
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: bitrate,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2,
    AVVideoExpectedSourceFrameRateKey: Int(fps),
    AVVideoAllowFrameReorderingKey: true,
  ],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
  kCVPixelBufferWidthKey as String: width,
  kCVPixelBufferHeightKey as String: height,
])
writer.add(input)
guard writer.startWriting() else { fatalError("could not start: \(String(describing: writer.error))") }
writer.startSession(atSourceTime: .zero)

let space = CGColorSpace(name: CGColorSpace.sRGB)!
for (index, name) in files.enumerated() {
  autoreleasepool {
    guard let source = CGImageSourceCreateWithURL(dir.appendingPathComponent(name) as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { fatalError("unreadable frame \(name)") }
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.004) }
    var made: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &made)
    guard let buffer = made else { fatalError("no pixel buffer") }
    CVPixelBufferLockBaseAddress(buffer, [])
    let context = CGContext(
      data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height, bitsPerComponent: 8,
      bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: space,
      bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
    context.interpolationQuality = .high
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    CVPixelBufferUnlockBaseAddress(buffer, [])
    if !adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(index), timescale: fps)) {
      fatalError("append failed at \(index): \(String(describing: writer.error))")
    }
  }
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
guard writer.status == .completed else { fatalError("write failed: \(String(describing: writer.error))") }

// Read it back, so a file that will not play is caught here and not on a phone.
let asset = AVURLAsset(url: out)
let track = asset.tracks(withMediaType: .video).first!
let size = (try? FileManager.default.attributesOfItem(atPath: out.path)[.size] as? Int) ?? 0
print("\(out.lastPathComponent): \(files.count) frames, \(String(format: "%.2f", CMTimeGetSeconds(asset.duration))) s, \(Int(track.naturalSize.width))x\(Int(track.naturalSize.height)), \(String(format: "%.0f", track.nominalFrameRate)) fps, \(size / 1024) KB")
