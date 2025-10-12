from app.train_models import train_subject_specific, train_loso

BASE_PATH = "data/"

# Subject-specific (for one subject)
train_subject_specific(BASE_PATH, subject_id=1)

# LOSO across all subjects
train_loso(BASE_PATH)
